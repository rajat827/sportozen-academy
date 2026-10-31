import { test, expect, type APIRequestContext } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import type {
  AnnouncementView,
  AnnouncementPublic,
} from "../../src/domain/batch-announcement";
test.use({ actionTimeout: 15000 });
test("actual batch announcements preview deduplicated guardians, require approval and retain provider blockers across responsive reloads", async ({
  playwright,
  browser,
}) => {
  test.setTimeout(180000);
  const origin = "http://127.0.0.1:3001",
    suffix = crypto.randomUUID(),
    shots = "docs/screenshots/final-fixes/announcements";
  async function account(name: string) {
    const api = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const email = `${name}-${suffix}@example.test`;
    const response = await api.post("/api/auth/sign-up/email", {
      data: { name, email, password: `Synthetic-only-${crypto.randomUUID()}` },
    });
    expect(response.status(), await response.text()).toBe(200);
    return { api, email, id: (await response.json()).user.id as string };
  }
  const owner = await account("AnnouncementOwner");
  await new Promise((resolve) => setTimeout(resolve, 11000));
  const parent = await account("AnnouncementGuardian");
  const post = async <T>(
    api: APIRequestContext,
    path: string,
    data: unknown,
    status = 200,
  ) => {
    const response = await api.post(path, { data });
    expect(response.status(), await response.text()).toBe(status);
    return response.json() as Promise<T>;
  };
  const academy = await post<{ id: string }>(
    owner.api,
    "/api/workspaces",
    {
      name: "Synthetic Announcement Academy",
      contactEmail: "announcement@example.test",
      country: "IN",
      language: "en",
      currency: "INR",
      timezone: "Asia/Kolkata",
      dateLocale: "en-IN",
      measurementSystem: "METRIC",
      brandAccent: "#008463",
      modules: ["development", "reports", "communication"],
      demo: false,
    },
    201,
  );
  const root = `/api/workspaces/${academy.id}`;
  const children = [] as { id: string }[];
  for (const name of [
    "Fictional First Child",
    "Fictional Second Child",
    "Fictional Unlinked Child",
  ])
    children.push(
      await post<{ id: string }>(
        owner.api,
        `${root}/records/player`,
        { name, squad: "U12", coachId: owner.id },
        201,
      ),
    );
  const branch = await post<{ id: string }>(
    owner.api,
    `${root}/records/branch`,
    { name: "Recorded Branch", timezone: "Asia/Kolkata" },
    201,
  );
  const batches = [] as { id: string }[];
  for (const [name, playerIds] of [
    ["Under 10", [children[0].id, children[2].id]],
    ["Under 12", [children[1].id]],
  ] as const)
    batches.push(
      await post<{ id: string }>(owner.api, `${root}/training`, {
        requestId: crypto.randomUUID(),
        action: "squad",
        data: { name, branchId: branch.id, playerIds },
      }),
    );
  const invite = await post<{ token: string }>(owner.api, `${root}/actions`, {
    action: "invite",
    data: {
      email: parent.email,
      role: "PARENT",
      playerIds: [children[0].id, children[1].id],
      guardianVerified: true,
    },
  });
  await post(parent.api, "/api/invitations/accept", { token: invite.token });
  await post(owner.api, `${root}/communication`, {
    action: "contact",
    data: {
      guardianId: parent.id,
      expectedVersion: 0,
      phone: "+12025550101",
      verificationReference: "Synthetic verified guardian",
      consentReference: "Synthetic academy-named operational consent",
      verified: true,
      optedIn: true,
      weekly: true,
      monthly: true,
      operational: true,
    },
  });
  const context = await browser.newContext({
      storageState: await owner.api.storageState(),
    }),
    page = await context.newPage(),
    errors: string[] = [],
    external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.protocol.startsWith("http") && url.origin !== origin)
      external.push(url.origin + url.pathname);
  });
  await page.goto(`/workspace/${academy.id}?section=messages`);
  await page.bringToFront();
  await page
    .getByRole("button", { name: "Batch announcements", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Batch announcements",
    exact: true,
  });
  await expect(
    dialog.getByRole("combobox", {
      name: "Announcement audience",
      exact: true,
    }),
  ).toBeVisible();
  await dialog
    .getByRole("combobox", { name: "Announcement batch", exact: true })
    .selectOption(batches[0].id);
  await dialog
    .getByLabel("Generic announcement", { exact: true })
    .fill(
      "Venue changed for the next training sessions. Check the saved academy schedule before travelling.",
    );
  const preview = dialog.getByRole("button", {
    name: "Preview recipients and message",
    exact: true,
  });
  await preview.scrollIntoViewIfNeeded();
  await expect
    .poll(
      () =>
        preview.evaluate((button) => {
          const bounds = button.getBoundingClientRect();
          const target = document.elementFromPoint(
            bounds.left + bounds.width / 2,
            bounds.top + bounds.height / 2,
          );
          return !!target && button.contains(target);
        }),
      {
        message:
          "Announcement Preview must receive actual pointer events above the backdrop",
      },
    )
    .toBe(true);
  await preview.click();
  await expect(
    dialog.getByRole("heading", { name: "1 eligible recipients", exact: true }),
  ).toBeVisible();
  await expect(dialog).toContainText("Selected player has no linked guardian");
  await dialog
    .getByRole("combobox", { name: "Announcement audience", exact: true })
    .selectOption("MULTIPLE");
  await dialog
    .getByRole("checkbox", { name: "Select All", exact: true })
    .check();
  await preview.click();
  await expect(dialog).toContainText(
    "1 duplicate child/contact selections removed.",
  );
  await dialog
    .getByRole("combobox", { name: "Announcement audience", exact: true })
    .selectOption("ALL");
  await expect(
    dialog.getByRole("checkbox", { name: "Select All", exact: true }),
  ).toBeChecked();
  await preview.click();
  await expect(
    dialog.getByRole("heading", { name: "1 eligible recipients", exact: true }),
  ).toBeVisible();
  await expect(dialog).toContainText("contact ending 0101");
  await expect(dialog).not.toContainText("+12025550101");
  await dialog
    .getByRole("button", { name: "Save announcement draft", exact: true })
    .click();
  const view = async () => {
    const response = await owner.api.get(`${root}/communication/announcements`);
    expect(response.status()).toBe(200);
    return response.json() as Promise<AnnouncementView>;
  };
  await expect
    .poll(async () => (await view()).announcements[0]?.status)
    .toBe("DRAFT");
  await dialog
    .getByRole("button", {
      name: "Send announcement for approval",
      exact: true,
    })
    .click();
  const approve = dialog.getByRole("button", {
    name: "Approve announcement",
    exact: true,
  });
  await expect(approve).toBeDisabled();
  await preview.click();
  await dialog
    .getByRole("checkbox", {
      name: "I reviewed the final message, generic privacy, eligible recipients and exclusions",
      exact: true,
    })
    .check();
  await approve.click();
  await expect
    .poll(async () => (await view()).announcements[0]?.status)
    .toBe("APPROVED");
  await preview.click();
  await expect(dialog).toContainText(
    "An academy-approved operational WhatsApp template is not configured.",
  );
  const queue = dialog.getByRole("button", {
    name: "Queue approved announcement",
    exact: true,
  });
  await expect(queue).toBeDisabled();
  const saved = (await view()).announcements[0] as AnnouncementPublic;
  expect(saved.batchIds.sort()).toEqual(
    batches.map((batch) => batch.id).sort(),
  );
  expect((await view()).jobs).toEqual([]);
  expect(
    (await parent.api.get(`${root}/communication/announcements`)).status(),
  ).toBe(403);
  await mkdir(shots, { recursive: true });
  for (const width of [1536, 390, 320]) {
    await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
    await page.bringToFront();
    await page.evaluate(() => document.fonts.ready);
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    const save = dialog.getByRole("button", {
      name: "Save announcement draft",
      exact: true,
    });
    await expect(save).toBeVisible();
    expect(
      await save.evaluate((button) => {
        const bounds = button.getBoundingClientRect();
        const target = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
        return !!target && button.contains(target);
      }),
      "The persistent announcement action must be above its backdrop",
    ).toBe(true);
    const action = await save.boundingBox();
    expect(action!.y + action!.height).toBeLessThanOrEqual(
      width === 1536 ? 1024 : 844,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await page.screenshot({
      path: `${shots}/announcement-${width}.png`,
      fullPage: true,
    });
  }
  await dialog
    .getByRole("button", { name: "Close batch announcements", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Batch announcements", exact: true }),
  ).toBeFocused();
  await page.reload();
  await page
    .getByRole("button", { name: "Batch announcements", exact: true })
    .click();
  await dialog
    .getByRole("combobox", { name: "Saved announcements", exact: true })
    .selectOption(saved.id);
  await expect(dialog).toContainText("Saved status: APPROVED");
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  await context.close();
  await owner.api.dispose();
  await parent.api.dispose();
});
