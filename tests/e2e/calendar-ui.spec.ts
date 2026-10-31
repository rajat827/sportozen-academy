import { evidencePath } from "./evidence-path";
import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const captures = evidencePath("docs/screenshots/calendar-ui/after");
const regressions = evidencePath("docs/screenshots/calendar-ui/regressions");
const storageKey = "sportozen-design-preview-v1";
const firstId = "riverside:U10 Foundations:2026-10-20";
const secondId = "riverside:U10 Foundations:2026-10-22";
const toolsButton = (page: Page) =>
  page.getByRole("button", {
    name: "Preview context & screen gallery",
    exact: true,
  });
const panel = (page: Page) => page.locator(".cal-panel:visible");
const eventButton = (page: Page, id: string) =>
  page.locator(`button.cal-event[data-session-id="${id}"]:visible`);

interface StoredPreview {
  academyId: string;
  playerId: string;
  attendance: Record<string, string>;
  fields: Record<string, Record<string, string>>;
  messages: unknown[];
}
interface StoredSession {
  id: string;
  version: number;
  date: string;
  start: string;
  end: string;
  status: string;
  copiedFrom?: string;
  parentPublished: boolean;
}

test.use({ actionTimeout: 15000 });

function recordRequests(page: Page) {
  const errors: string[] = [],
    businessCalls: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      businessCalls.push(request.url());
  });
  return { errors, businessCalls };
}

async function stored(page: Page): Promise<StoredPreview> {
  return page.evaluate((key) => {
    const value = sessionStorage.getItem(key);
    if (!value) throw new Error("The preview has not persisted a record.");
    return JSON.parse(value).state;
  }, storageKey);
}
async function savedSession(page: Page, id: string): Promise<StoredSession> {
  const state = await stored(page);
  return JSON.parse(
    state.fields[`calendar-session:${state.academyId}:${id}`].record,
  );
}
async function example(
  page: Page,
  scenario: "default" | "simultaneous" | "event-types",
) {
  await toolsButton(page).click();
  const tools = page.getByRole("dialog", {
    name: "Preview tools",
    exact: true,
  });
  await tools
    .getByLabel("Calendar example", { exact: true })
    .selectOption(scenario);
  await page.keyboard.press("Escape");
  await expect(tools).toBeHidden();
}
async function selectEvent(page: Page, id: string) {
  await eventButton(page, id).first().click();
  await expect(panel(page)).toHaveAttribute("data-session-id", id);
  expect((await stored(page)).fields["session-context"].id).toBe(id);
}
async function capture(page: Page, file: string, fullPage = true) {
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, fullPage });
}
async function touchTarget(control: Locator) {
  await expect(control).toBeVisible();
  const box = await control.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
}

test("Calendar captures the approved composition at six widths without clipping or inventing rosters", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { errors, businessCalls } = recordRequests(page);
  await mkdir(captures, { recursive: true });
  const evidence = [];
  await page.goto("/design-preview/sessions");
  await example(page, "simultaneous");
  for (const [width, height] of [
    [1536, 1024],
    [1440, 900],
    [1024, 900],
    [768, 1024],
    [390, 844],
    [320, 844],
  ] as const) {
    await page.setViewportSize({ width, height });
    const response = await page.goto("/design-preview/sessions");
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { level: 1, name: "Calendar", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".approved-calendar")).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Preview tools", exact: true }),
    ).toBeHidden();
    await expect(
      page.getByLabel("Calendar example", { exact: true }),
    ).toBeHidden();
    await expect(
      page.getByText(
        "Design preview — fictional data; no payments or messages are processed.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator(".cal-fixture-note").first()).toContainText(
      "fictional",
      { ignoreCase: true },
    );
    await expect(
      page.getByRole("button", {
        name: width < 768 ? "Agenda" : "Week",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    if (width >= 1200) {
      await expect(
        panel(page).getByRole("heading", {
          name: "U12 Training Session",
          exact: true,
        }),
      ).toBeVisible();
      await expect(panel(page)).toContainText("0 recorded");
    } else {
      await expect(panel(page)).toBeHidden();
      if (width < 768) {
        await touchTarget(toolsButton(page));
        await touchTarget(
          page.getByRole("button", { name: "Today", exact: true }),
        );
      }
    }
    await page.evaluate(() => document.fonts.ready);
    await expect
      .poll(() =>
        page
          .locator(".approved-calendar img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    const metrics = await page.evaluate(() => {
      const selected = document
        .querySelector(".cal-panel-desktop")
        ?.getBoundingClientRect();
      return {
        width: innerWidth,
        height: innerHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
        font: getComputedStyle(document.querySelector(".approved-calendar")!)
          .fontFamily,
        panel: selected ? { width: selected.width, x: selected.x } : null,
        imageFailures: [
          ...document.querySelectorAll<HTMLImageElement>(
            ".approved-calendar img",
          ),
        ]
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.src),
      };
    });
    expect(metrics.overflow, `${width}px viewport`).toBe(false);
    expect(metrics.font).toContain("Preview Noto");
    expect(metrics.imageFailures).toEqual([]);
    if (metrics.panel) {
      expect(metrics.panel.width).toBeGreaterThanOrEqual(440);
      expect(metrics.panel.width).toBeLessThanOrEqual(448);
    }
    evidence.push(metrics);
    await capture(page, `${captures}/calendar-${width}.png`, false);
    await capture(page, `${captures}/calendar-${width}-full.png`);
  }
  for (const scenario of ["empty", "loading", "failed-save"] as const) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/design-preview/sessions?scenario=${scenario}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "Calendar", exact: true }),
    ).toBeVisible();
    await expect(page.locator("button.cal-event")).toHaveCount(0);
    await expect(panel(page)).toBeHidden();
    if (scenario === "loading")
      await expect(
        page.getByText("Loading fictional calendar records…", { exact: true }),
      ).toBeVisible();
    else if (scenario === "failed-save") {
      const calendarError = page
        .locator(".approved-calendar")
        .getByRole("alert");
      await expect(calendarError).toHaveCount(1);
      await expect(calendarError).toContainText(
        "Unable to load calendar records. No empty schedule is inferred.",
      );
    } else
      await expect(
        page.getByText("No accessible sessions in this period.", {
          exact: true,
        }),
      ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
    await capture(page, `${captures}/calendar-${scenario}-390.png`);
  }
  await writeFile(
    `${captures}/capture.json`,
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        route: "/design-preview/sessions",
        example: "explicit simultaneous owner example",
        evidence,
      },
      null,
      2,
    ),
  );
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("Calendar views, date navigation and combined filters retain their meaning", async ({
  page,
}) => {
  const { errors, businessCalls } = recordRequests(page);
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/design-preview/sessions");
  await expect(page.locator(".cal-week .cal-day-heading")).toHaveCount(7);
  await expect(page.locator(".cal-week button.cal-event")).toHaveCount(2);
  await page
    .getByLabel("Selected calendar date", { exact: true })
    .fill("2026-10-22");
  await expect(
    page.getByLabel("Selected calendar date", { exact: true }),
  ).toHaveValue("2026-10-22");
  await page.getByRole("button", { name: "Month", exact: true }).click();
  await expect(page.locator(".cal-month-day")).toHaveCount(42);
  await page
    .getByRole("button", { name: "Next calendar period", exact: true })
    .click();
  await expect(
    page.getByLabel("Selected calendar date", { exact: true }),
  ).toHaveValue("2026-11-22");
  await expect(
    page.getByText("No accessible sessions in this period.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    page.getByLabel("Selected calendar date", { exact: true }),
  ).toHaveValue("2026-10-20");
  await page.getByRole("button", { name: "Agenda", exact: true }).click();
  await expect(page.locator(".cal-agenda button.cal-event")).toHaveCount(2);
  await example(page, "event-types");
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.locator(".cal-all-day")).toContainText("Academy Closed");
  await page
    .getByLabel("All Batches", { exact: true })
    .selectOption("U10 Foundations");
  await page
    .getByLabel("All Session Types", { exact: true })
    .selectOption("Training");
  await page.getByLabel("All Coaches", { exact: true }).selectOption("maya");
  await page
    .getByLabel("All Venues", { exact: true })
    .selectOption("north-pitch");
  await expect(page.locator(".cal-week button.cal-event")).toHaveCount(2);
  await page
    .getByLabel("All Session Types", { exact: true })
    .selectOption("Match");
  await expect(
    page.getByText("No sessions match these filters in this period.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("All Batches", { exact: true })).toHaveValue(
    "U10 Foundations",
  );
  await expect(page.getByLabel("All Coaches", { exact: true })).toHaveValue(
    "maya",
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".cal-week button.cal-event")).toHaveCount(5);
  await expect(page.locator(".cal-all-day")).toContainText("Academy Closed");
  await page.getByRole("button", { name: "Add Session", exact: true }).click();
  const draftEditor = page
    .getByRole("dialog")
    .filter({ has: page.getByLabel("Session title", { exact: true }) });
  await expect(
    draftEditor.getByLabel("Session date", { exact: true }),
  ).toHaveValue("");
  await expect(
    draftEditor.getByLabel("Start time", { exact: true }),
  ).toHaveValue("");
  await draftEditor
    .getByLabel("Session date", { exact: true })
    .fill("2026-10-27");
  await draftEditor.getByLabel("Start time", { exact: true }).fill("17:30");
  await draftEditor.getByLabel("End time", { exact: true }).fill("18:30");
  await draftEditor
    .getByRole("button", { name: "Save session draft", exact: true })
    .click();
  await expect(draftEditor).toBeHidden();
  const newId = await panel(page).getAttribute("data-session-id");
  expect(newId).toBeTruthy();
  expect(await savedSession(page, newId!)).toMatchObject({
    date: "2026-10-27",
    status: "Draft",
    parentPublished: false,
  });
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("three simultaneous sessions expand separately and open only their own empty session desks", async ({
  page,
}) => {
  test.setTimeout(150000);
  const { errors, businessCalls } = recordRequests(page);
  await mkdir(captures, { recursive: true });
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/design-preview/sessions");
  await expect(
    page.getByRole("button", { name: /3 simultaneous sessions/ }),
  ).toHaveCount(0);
  await example(page, "simultaneous");
  for (const [key, batch, coach, space] of [
    ["u10", "U10 Development", "Rahul", "Zone A"],
    ["u12", "U12 Foundations", "Neha", "Zone B"],
    ["u14", "U14 Competitive", "Amit", "Main Pitch"],
  ] as const) {
    const id = `riverside:simultaneous:${key}:2026-10-20`;
    await page
      .getByRole("button", { name: /5:00 PM, 3 simultaneous sessions/ })
      .click();
    const list = page.getByRole("dialog", {
      name: "Sessions at this time",
      exact: true,
    });
    await expect(list.locator("button.cal-event")).toHaveCount(3);
    if (key === "u10")
      await capture(page, `${captures}/simultaneous-expanded-1536.png`);
    await list.locator(`button[data-session-id="${id}"]`).click();
    await expect(list).toBeHidden();
    await expect(panel(page)).toHaveAttribute("data-session-id", id);
    await expect(panel(page)).toContainText(batch);
    await expect(panel(page)).toContainText(coach);
    await expect(panel(page)).toContainText(space);
    await expect(panel(page)).toContainText("0 recorded");
    await panel(page)
      .getByRole("tab", { name: "Players (0)", exact: true })
      .click();
    await expect(panel(page)).toContainText("No player roster recorded");
    await panel(page)
      .getByRole("tab", { name: "Attendance", exact: true })
      .click();
    await expect(panel(page)).toContainText(
      "Opening this session does not mark anyone present",
    );
    await panel(page)
      .getByRole("tab", { name: "Details", exact: true })
      .click();
    if (key === "u12") await capture(page, `${captures}/u12-details-1536.png`);
    await panel(page)
      .getByRole("link", { name: "Open Session", exact: true })
      .click();
    await expect(page).toHaveURL(/design-preview\/session-agenda$/);
    expect((await stored(page)).fields["session-context"].id).toBe(id);
    await expect(page.locator("main")).toContainText(`${batch} · 20 October`);
    await expect(page.locator("main")).toContainText("0 recorded players");
    await expect(page.locator("main")).toContainText(
      "No players are recorded in this session roster",
    );
    await expect(
      page.getByLabel("Session player", { exact: true }),
    ).toHaveCount(0);
    if (key === "u12")
      await capture(page, `${captures}/u12-session-desk-1536.png`);
    await page.goto("/design-preview/sessions");
  }
  await toolsButton(page).click();
  await page
    .getByRole("dialog", { name: "Preview tools", exact: true })
    .getByLabel("Calendar access example", { exact: true })
    .selectOption("COACH");
  await page.keyboard.press("Escape");
  await expect(panel(page)).toBeHidden();
  await expect(page.locator("button.cal-event")).toHaveCount(0);
  await expect(
    page.getByText("No accessible sessions in this period.", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("session copy, conflicting reschedule, failed persistence and confirmed cancellation keep outcomes separate", async ({
  page,
}) => {
  test.setTimeout(240000);
  const { errors, businessCalls } = recordRequests(page);
  await mkdir(captures, { recursive: true });
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        (window as Window & { failCalendarSave?: boolean }).failCalendarSave &&
        key === "sportozen-design-preview-v1"
      )
        throw new DOMException(
          "Simulated quota exhaustion",
          "QuotaExceededError",
        );
      return setItem.call(this, key, value);
    };
  });
  await page.setViewportSize({ width: 1536, height: 1024 });
  await page.goto("/design-preview/sessions");
  await selectEvent(page, firstId);
  await panel(page)
    .getByRole("link", { name: "Open Session", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Attendance", exact: true })
    .first()
    .click();
  await page
    .getByLabel("Attendance for Aarav Shah", { exact: true })
    .selectOption("Present");
  await page
    .getByLabel("Attendance for Isha Kapoor", { exact: true })
    .selectOption("Absent");
  await page.getByRole("link", { name: "Observation", exact: true }).click();
  await page
    .getByLabel("Coach observation", { exact: true })
    .fill("Source-session private observation.");
  await page
    .getByRole("button", { name: "Save observation", exact: true })
    .click();
  await page
    .getByLabel("Private session note", { exact: true })
    .fill("Source-session staff note.");
  await page
    .getByRole("button", { name: "Save private note", exact: true })
    .click();
  await page.goto("/design-preview/sessions");
  await panel(page)
    .getByRole("button", { name: "Copy Session", exact: true })
    .click();
  let editor = page.getByRole("dialog", {
    name: "Copy planned session",
    exact: true,
  });
  await expect(editor.getByLabel("Session date", { exact: true })).toHaveValue(
    "",
  );
  await expect(editor.getByLabel("Start time", { exact: true })).toHaveValue(
    "",
  );
  await expect(editor.getByLabel("End time", { exact: true })).toHaveValue("");
  await editor.getByLabel("Session date", { exact: true }).fill("2026-10-23");
  await editor.getByLabel("Start time", { exact: true }).fill("17:30");
  await editor.getByLabel("End time", { exact: true }).fill("18:30");
  await editor
    .getByRole("button", { name: "Save session draft", exact: true })
    .click();
  await expect(editor).toBeHidden();
  const copiedId = await panel(page).getAttribute("data-session-id");
  expect(copiedId).toBeTruthy();
  expect(copiedId).not.toBe(firstId);
  expect(await savedSession(page, copiedId!)).toMatchObject({
    status: "Draft",
    date: "2026-10-23",
    copiedFrom: firstId,
    parentPublished: false,
  });
  await panel(page)
    .getByRole("tab", { name: "Attendance", exact: true })
    .click();
  await expect(panel(page)).not.toContainText("Present");
  await expect(panel(page)).not.toContainText("Absent");
  await expect(panel(page).getByText("Unmarked", { exact: true })).toHaveCount(
    2,
  );
  await panel(page).getByRole("tab", { name: "Notes", exact: true }).click();
  await expect(
    panel(page).getByLabel("Staff-only session note", { exact: true }),
  ).toHaveValue("");
  await panel(page)
    .getByRole("button", { name: "Review and schedule draft", exact: true })
    .click();
  expect((await savedSession(page, copiedId!)).status).toBe("Scheduled");
  await panel(page)
    .getByRole("button", { name: "Edit Session", exact: true })
    .click();
  editor = page.getByRole("dialog", {
    name: "Copy planned session",
    exact: true,
  });
  await editor.getByLabel("Session date", { exact: true }).fill("2026-10-22");
  await editor.getByLabel("Start time", { exact: true }).fill("18:00");
  await editor.getByLabel("End time", { exact: true }).fill("19:00");
  await editor
    .getByRole("button", { name: "Save schedule change", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText("already assigned");
  await expect(editor.getByLabel("Session date", { exact: true })).toHaveValue(
    "2026-10-22",
  );
  expect((await savedSession(page, copiedId!)).date).toBe("2026-10-23");
  await editor.getByLabel("Session date", { exact: true }).fill("2026-10-23");
  await editor.getByLabel("Start time", { exact: true }).fill("19:00");
  await editor.getByLabel("End time", { exact: true }).fill("20:00");
  await page.evaluate(() => {
    (window as Window & { failCalendarSave?: boolean }).failCalendarSave = true;
  });
  await editor
    .getByRole("button", { name: "Save schedule change", exact: true })
    .click();
  await expect(editor.getByRole("alert")).toContainText(
    /persist|save|storage/i,
  );
  await expect(editor.getByLabel("Start time", { exact: true })).toHaveValue(
    "19:00",
  );
  expect((await savedSession(page, copiedId!)).start).toBe("17:30");
  await capture(page, `${captures}/reschedule-failed-save-1536.png`);
  await page.evaluate(() => {
    (window as Window & { failCalendarSave?: boolean }).failCalendarSave =
      false;
  });
  await editor
    .getByRole("button", { name: "Save schedule change", exact: true })
    .click();
  await expect(editor).toBeHidden();
  expect(await savedSession(page, copiedId!)).toMatchObject({
    date: "2026-10-23",
    start: "19:00",
    status: "Scheduled",
    parentPublished: false,
  });
  await panel(page)
    .getByRole("button", { name: "Cancel Session", exact: true })
    .click();
  const cancel = page.getByRole("dialog", {
    name: "Confirm session cancellation",
    exact: true,
  });
  await expect(
    cancel.getByRole("button", {
      name: "Confirm cancellation in preview",
      exact: true,
    }),
  ).toBeDisabled();
  await cancel
    .getByLabel("Cancellation reason", { exact: true })
    .fill("Weather review.");
  await cancel
    .getByRole("button", { name: "Keep session", exact: true })
    .click();
  expect((await savedSession(page, copiedId!)).status).toBe("Scheduled");
  await panel(page)
    .getByRole("button", { name: "Cancel Session", exact: true })
    .click();
  await cancel
    .getByLabel("Cancellation reason", { exact: true })
    .fill("Weather review confirmed.");
  await cancel
    .getByRole("button", {
      name: "Confirm cancellation in preview",
      exact: true,
    })
    .click();
  await expect(cancel).toBeHidden();
  await expect(panel(page)).toHaveAttribute("data-session-id", copiedId!);
  await expect(panel(page).locator(".cal-panel-status")).toHaveText(
    "Cancelled",
  );
  const state = await stored(page);
  expect(
    state.fields[`calendar-attendance:riverside:${firstId}:aarav`].status,
  ).toBe("Present");
  expect(
    state.fields[`calendar-observation:riverside:${firstId}:aarav`].observation,
  ).toBe("Source-session private observation.");
  expect(
    state.fields[`calendar-observation:riverside:${copiedId}:aarav`],
  ).toBeUndefined();
  expect(state.fields[`calendar-note:riverside:${copiedId}`]).toBeUndefined();
  expect(state.messages).toHaveLength(1);
  await capture(page, `${captures}/cancelled-session-retained-1536.png`);
  await selectEvent(page, firstId);
  await panel(page)
    .getByRole("button", { name: "Edit Session", exact: true })
    .click();
  const sharedEditor = page.getByRole("dialog", {
    name: "Change session schedule",
    exact: true,
  });
  await sharedEditor
    .getByLabel("Session date", { exact: true })
    .fill("2026-10-21");
  await sharedEditor
    .getByRole("button", { name: "Save schedule change", exact: true })
    .click();
  await expect(sharedEditor).toBeHidden();
  const altered = await stored(page);
  expect(altered.fields["weekly:aarav"].published).toBe("false");
  expect(altered.fields["weekly:aarav"].status).toBe("Review needed");
  expect(altered.fields["weekly:leo"]).toBeUndefined();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-preview/parent-home");
  await expect(page.locator(".ar-week-card")).toContainText(
    "Your plan is awaiting coach review",
  );
  await expect(page.locator(".ar-next")).not.toContainText("20 October");
  await expect(page.locator(".ar-next")).toContainText("awaiting coach review");
  await capture(page, `${captures}/parent-schedule-review-needed-390.png`);
  await page.goto("/design-preview/parent-weekly");
  await expect(
    page.getByRole("heading", {
      name: "Your next plan is awaiting coach review",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("20 October");
  await page.goto("/design-preview/parent-schedule");
  await expect(page.locator("main")).toContainText(
    "Your next schedule is awaiting coach review",
  );
  await expect(
    page.locator(
      "main a[href$='/session-summary'], main a[href$='/session-agenda']",
    ),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Show calendar", exact: true })
    .click();
  await expect(
    page.getByLabel("Approved linked-child week calendar", { exact: true }),
  ).not.toContainText("17:30 U10");
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("mobile details contain keyboard focus, restore it and protect unsaved private notes", async ({
  page,
}) => {
  test.setTimeout(150000);
  const { errors, businessCalls } = recordRequests(page);
  await mkdir(captures, { recursive: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/design-preview/sessions");
  const trigger = eventButton(page, firstId).first();
  await trigger.focus();
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", {
    name: "Selected session details",
    exact: true,
  });
  await expect(sheet).toBeVisible();
  for (const key of ["Tab", "Shift+Tab"])
    for (let index = 0; index < 15; index++) {
      await page.keyboard.press(key);
      expect(
        await sheet.evaluate((element) =>
          element.contains(document.activeElement),
        ),
      ).toBe(true);
    }
  const box = await sheet.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  await capture(page, `${captures}/session-sheet-390.png`, false);
  await sheet.getByRole("tab", { name: "Notes", exact: true }).click();
  const note = sheet.getByLabel("Staff-only session note", { exact: true });
  await note.fill("Keep this private draft while reviewing.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.keyboard.press("Escape");
  await expect(sheet).toBeVisible();
  await expect(note).toHaveValue("Keep this private draft while reviewing.");
  await sheet
    .getByRole("button", { name: "Save private note", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(trigger).toBeFocused();
  await selectEvent(page, secondId);
  await panel(page).getByRole("tab", { name: "Notes", exact: true }).click();
  await expect(
    panel(page).getByLabel("Staff-only session note", { exact: true }),
  ).toHaveValue("");
  await panel(page)
    .getByRole("button", { name: "Close session details", exact: true })
    .click();
  await page.setViewportSize({ width: 1536, height: 1024 });
  await selectEvent(page, firstId);
  await panel(page).getByRole("tab", { name: "Notes", exact: true }).click();
  await panel(page)
    .getByLabel("Staff-only session note", { exact: true })
    .fill("Unsaved replacement stays here.");
  page.once("dialog", (dialog) => dialog.dismiss());
  await eventButton(page, secondId).first().click();
  await expect(panel(page)).toHaveAttribute("data-session-id", firstId);
  await expect(
    panel(page).getByLabel("Staff-only session note", { exact: true }),
  ).toHaveValue("Unsaved replacement stays here.");
  page.once("dialog", (dialog) => dialog.accept());
  await eventButton(page, secondId).first().click();
  await expect(panel(page)).toHaveAttribute("data-session-id", secondId);
  expect(
    (await stored(page)).fields[`calendar-note:riverside:${firstId}`].body,
  ).toBe("Keep this private draft while reviewing.");
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});

test("Home, Players, player profile and Parent Home remain usable and captured without business API calls", async ({
  page,
}) => {
  test.setTimeout(180000);
  const { errors, businessCalls } = recordRequests(page);
  await mkdir(regressions, { recursive: true });
  for (const [route, title] of [
    ["coach-today", "Good morning, Coach Maya"],
    ["players", "Players"],
    ["player-profile", "Aarav Shah"],
    ["parent-home", ""],
  ] as const)
    for (const width of [1536, 390] as const) {
      await page.setViewportSize({
        width,
        height: width === 1536 ? 1024 : 844,
      });
      const response = await page.goto(`/design-preview/${route}`);
      expect(response?.status()).toBe(200);
      if (title)
        await expect(
          page.getByRole("heading", { level: 1, name: title, exact: true }),
        ).toBeVisible();
      else {
        await expect(page.locator(".approved-review")).toBeVisible();
        await expect(page.locator(".ar-week-card")).toContainText(
          "Receive into space, then find the next pass",
        );
      }
      await expect(
        page.getByRole("dialog", { name: "Preview tools", exact: true }),
      ).toBeHidden();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        `${route}-${width}`,
      ).toBe(false);
      await capture(page, `${regressions}/${route}-${width}.png`, false);
      await capture(page, `${regressions}/${route}-${width}-full.png`);
    }
  await page.goto("/design-preview/coach-today");
  await expect(page.locator(".hd-ai")).toContainText("Coming soon");
  await page.getByRole("link", { name: "Start Session", exact: true }).click();
  await expect(page.locator("main")).toContainText("20 October");
  expect((await stored(page)).fields["session-context"].id).toBe(firstId);
  expect(errors).toEqual([]);
  expect(businessCalls).toEqual([]);
});
