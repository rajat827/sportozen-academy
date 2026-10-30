# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home-ui.spec.ts >> Home summary values agree with recorded data and do not invent unread or current-month reports
- Location: tests\e2e\home-ui.spec.ts:355:5

# Error details

```
Test timeout of 120000ms exceeded.
```

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Preview context & screen gallery', exact: true })
    - locator resolved to <button type="button" data-state="closed" aria-expanded="false" aria-haspopup="dialog" class="hd-tools-trigger" aria-label="Preview context & screen gallery">…</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - generic [ref=f2e2]:
    - link "Skip to preview content" [ref=f2e3] [cursor=pointer]:
      - /url: "#preview-content"
    - complementary [ref=f2e4]:
      - link "Sportozen Academy" [ref=f2e5] [cursor=pointer]:
        - /url: /design-preview/coach-today
        - generic [ref=f2e6]:
          - text: Sportozen
          - generic [ref=f2e7]: Academy
      - link "Riverside academy crest Riverside Football Academy India" [ref=f2e8] [cursor=pointer]:
        - /url: /design-preview/coach-more
        - img "Riverside academy crest" [ref=f2e9]
        - generic [ref=f2e10]:
          - strong [ref=f2e11]: Riverside Football Academy
          - generic [ref=f2e12]: India
      - navigation "Preview workspace navigation" [ref=f2e13]:
        - link "Home" [ref=f2e15] [cursor=pointer]:
          - /url: /design-preview/coach-today
        - link "Calendar" [ref=f2e20] [cursor=pointer]:
          - /url: /design-preview/sessions
        - link "Players" [ref=f2e24] [cursor=pointer]:
          - /url: /design-preview/players
        - link "Training" [ref=f2e31] [cursor=pointer]:
          - /url: /design-preview/weekly-plan
        - link "Messages" [ref=f2e35] [cursor=pointer]:
          - /url: /design-preview/parent-questions
        - link "Reports" [ref=f2e39] [cursor=pointer]:
          - /url: /design-preview/report-queue
        - generic [ref=f2e43]:
          - button "Fees" [disabled] [ref=f2e44]
          - link "More" [ref=f2e49] [cursor=pointer]:
            - /url: /design-preview/coach-more
      - link "AI Video Analysis Coming soon" [ref=f2e51] [cursor=pointer]:
        - /url: /design-preview/ai-coming-soon
        - generic [ref=f2e56]:
          - strong [ref=f2e57]: AI Video Analysis
          - generic [ref=f2e58]: Coming soon
      - link "MR Coach Maya Coach" [ref=f2e61] [cursor=pointer]:
        - /url: /design-preview/coach-more
        - generic [ref=f2e62]: MR
        - generic [ref=f2e63]:
          - strong [ref=f2e64]: Coach Maya
          - generic [ref=f2e65]: Coach
    - generic [ref=f2e68]:
      - banner [ref=f2e69]:
        - generic [ref=f2e70]:
          - button "Open player search" [ref=f2e71] [cursor=pointer]
          - textbox "Search players, sessions, messages" [ref=f2e75]:
            - /placeholder: Search players, sessions, messages…
        - link "Parent questions" [ref=f2e76] [cursor=pointer]:
          - /url: /design-preview/parent-questions
        - button "Search and dashboard help" [ref=f2e80] [cursor=pointer]
        - button "Preview context & screen gallery" [ref=f2e84] [cursor=pointer]:
          - generic [ref=f2e85]: MR
      - main [ref=f2e86]:
        - generic [ref=f2e87]:
          - generic [ref=f2e88]:
            - heading "Good morning, Coach Maya" [level=1] [ref=f2e89]
            - paragraph [ref=f2e90]: Let’s build better players today.
          - time [ref=f2e91]: Wed, 30 Sept 2026
        - status [ref=f2e92]: Report draft saved; approval cleared until reviewed again.
        - generic [ref=f2e93]:
          - region "Primary training session" [ref=f2e94]:
            - img "Football boots and ball on a grass pitch, supplied reference artwork" [ref=f2e95]
            - generic [ref=f2e96]:
              - generic [ref=f2e97]: Today’s Session
              - heading "No session scheduled" [level=2] [ref=f2e98]
              - paragraph [ref=f2e99]: No accessible session on Wed, 30 Sept 2026.
              - link "Add Session" [ref=f2e100] [cursor=pointer]:
                - /url: /design-preview/session-builder
          - generic [ref=f2e103]:
            - generic [ref=f2e104]:
              - heading "Today’s Schedule" [level=2] [ref=f2e105]
              - link "View Calendar" [ref=f2e106] [cursor=pointer]:
                - /url: /design-preview/sessions
            - paragraph [ref=f2e108]: No accessible sessions today.
        - generic [ref=f2e109]:
          - generic [ref=f2e117]:
            - strong [ref=f2e118]: "3"
            - paragraph [ref=f2e119]: Total Players
            - generic [ref=f2e120]: Current academy roster
          - generic [ref=f2e125]:
            - strong [ref=f2e126]: "2"
            - paragraph [ref=f2e127]: Active Batches
            - generic [ref=f2e128]: U10, U12
          - generic [ref=f2e134]:
            - strong [ref=f2e135]: "0"
            - paragraph [ref=f2e136]: Upcoming Sessions
            - generic [ref=f2e137]: Next 7 days · current plan
          - generic [ref=f2e142]:
            - strong [ref=f2e143]: —
            - paragraph [ref=f2e144]: Unread Messages
            - generic [ref=f2e145]: Read status not recorded
            - generic [ref=f2e146]: 0 parent questions
        - generic [ref=f2e147]:
          - generic [ref=f2e148]:
            - generic [ref=f2e149]:
              - heading "Recent Activity" [level=2] [ref=f2e150]
              - link "View all" [ref=f2e151] [cursor=pointer]:
                - /url: /design-preview/parent-questions
            - link "Coach update · Aarav Shah In-app preview record · time not recorded" [ref=f2e153] [cursor=pointer]:
              - /url: /design-preview/parent-questions
              - generic [ref=f2e157]:
                - strong [ref=f2e158]: Coach update · Aarav Shah
                - generic [ref=f2e159]: In-app preview record · time not recorded
          - generic [ref=f2e160]:
            - generic [ref=f2e161]:
              - heading "Pending Actions" [level=2] [ref=f2e162]
              - link "View all" [ref=f2e163] [cursor=pointer]:
                - /url: /design-preview/coach-more
            - link "Review player reports (2) September 2026 · draft source review" [ref=f2e165] [cursor=pointer]:
              - /url: /design-preview/report-queue
              - generic [ref=f2e172]:
                - strong [ref=f2e173]: Review player reports (2)
                - generic [ref=f2e174]: September 2026 · draft source review
          - generic [ref=f2e177]:
            - heading "Quick Actions" [level=2] [ref=f2e179]
            - generic [ref=f2e180]:
              - link [ref=f2e181] [cursor=pointer]:
                - /url: /design-preview/session-builder
                - strong [ref=f2e184]: Add Session
              - button "Add Player" [disabled] [ref=f2e185]:
                - strong [ref=f2e189]: Add Player
              - link [ref=f2e190] [cursor=pointer]:
                - /url: /design-preview/parent-questions
                - strong [ref=f2e193]: Send Message
              - link [ref=f2e194] [cursor=pointer]:
                - /url: /design-preview/report-prepare
                - strong [ref=f2e198]: Generate Report
            - paragraph [ref=f2e199]: Add Player requires owner access.
        - generic [ref=f2e200]:
          - generic [ref=f2e201]:
            - generic [ref=f2e202]:
              - heading "Player Development Focus" [level=2] [ref=f2e203]
              - link "View Players" [ref=f2e204] [cursor=pointer]:
                - /url: /design-preview/players
            - generic [ref=f2e205]:
              - img "Illustrative player portrait from the supplied reference" [ref=f2e206]
              - generic [ref=f2e207]:
                - generic [ref=f2e208]: Aarav Shah · U10 Foundations
                - generic [ref=f2e209]: Current focus this week
                - strong [ref=f2e210]: Open body position before receiving
                - paragraph [ref=f2e211]: "Recorded development goal: Receive the ball into useful space"
          - generic [ref=f2e212]:
            - generic [ref=f2e213]:
              - heading "Reports This Month" [level=2] [ref=f2e214]
              - link "View all" [ref=f2e215] [cursor=pointer]:
                - /url: /design-preview/report-queue
            - generic [ref=f2e216]:
              - img "0 approved, 0 in review, 2 draft reports in September 2026" [ref=f2e217]:
                - generic [ref=f2e218]: 0 / 2
              - generic [ref=f2e219]:
                - paragraph [ref=f2e220]: 0 Approved
                - paragraph [ref=f2e222]: 0 In Review
                - paragraph [ref=f2e224]: 2 Draft
          - generic [ref=f2e226]:
            - generic [ref=f2e227]:
              - heading "What’s Next" [level=2] [ref=f2e229]
              - link "Create next week’s plan Plan sessions for 5 Oct – 11 Oct" [ref=f2e230] [cursor=pointer]:
                - /url: /design-preview/weekly-plan
                - generic [ref=f2e234]:
                  - strong [ref=f2e235]: Create next week’s plan
                  - generic [ref=f2e236]: Plan sessions for 5 Oct – 11 Oct
            - paragraph [ref=f2e239]: “Better players. Brighter futures.”— Sportozen Academy
        - paragraph [ref=f2e240]: Design preview — fictional data; no payments or messages are processed.
  - alert [ref=f2e241]
```

# Test source

```ts
  307 |       await expect(
  308 |         page.getByRole("heading", {
  309 |           name: "Good morning, Coach Maya",
  310 |           exact: true,
  311 |         }),
  312 |       ).toBeVisible();
  313 |       await expect(
  314 |         page.getByText(previewNotice, { exact: true }),
  315 |       ).toBeVisible();
  316 |       await expect(
  317 |         page.getByRole("link", { name: "Start Session", exact: true }),
  318 |       ).toHaveCount(0);
  319 |       if (scenario === "empty")
  320 |         await expect(page.locator(".hd-hero")).toContainText(
  321 |           "No session scheduled",
  322 |         );
  323 |       else if (scenario === "loading")
  324 |         await expect(
  325 |           page.getByText("Loading fictional records…", { exact: true }),
  326 |         ).toBeVisible();
  327 |       else await expect(page.locator("main").getByRole("alert")).toBeVisible();
  328 |       if (scenario !== "empty") {
  329 |         for (const id of ["players", "batches", "upcoming"])
  330 |           await expect(
  331 |             page.getByTestId(`home-${id}`).getByText("0", { exact: true }),
  332 |           ).toHaveCount(0);
  333 |         await expect(
  334 |           section(page, "Reports This Month").getByRole("img", {
  335 |             name: "Report counts unavailable",
  336 |             exact: true,
  337 |           }),
  338 |         ).toBeVisible();
  339 |       }
  340 |       expect(
  341 |         await page.evaluate(
  342 |           () => document.documentElement.scrollWidth > innerWidth,
  343 |         ),
  344 |         `${scenario}-${width}`,
  345 |       ).toBe(false);
  346 |       await page.screenshot({
  347 |         path: `${captureFolder}/home-${capture}-${width}.png`,
  348 |         fullPage: true,
  349 |       });
  350 |     }
  351 |   expect(errors).toEqual([]);
  352 |   expect(businessCalls).toEqual([]);
  353 | });
  354 |
  355 | test("Home summary values agree with recorded data and do not invent unread or current-month reports", async ({
  356 |   page,
  357 | }) => {
  358 |   test.setTimeout(120000);
  359 |   const { errors, businessCalls } = recordRequests(page);
  360 |   await page.goto("/design-preview/coach-today");
  361 |   for (const [id, value] of [
  362 |     ["players", "3"],
  363 |     ["batches", "2"],
  364 |     ["upcoming", "2"],
  365 |   ] as const)
  366 |     await expect(
  367 |       page.getByTestId(`home-${id}`).getByText(value, { exact: true }),
  368 |     ).toBeVisible();
  369 |   const messages = page.getByTestId("home-messages");
  370 |   await expect(messages).toContainText("Read status not recorded");
  371 |   await expect(messages).toContainText(/0\s+parent questions/i);
  372 |   await expect(section(page, "Reports This Month")).toContainText(
  373 |     "No October 2026 records. Latest period: September 2026",
  374 |   );
  375 |   for (const status of ["Approved", "In Review", "Draft"])
  376 |     await expect(section(page, "Reports This Month")).toContainText(
  377 |       new RegExp(`0\\s*${status}`),
  378 |     );
  379 |   await toolsButton(page).click();
  380 |   const tools = page.getByRole("dialog", {
  381 |     name: "Preview tools",
  382 |     exact: true,
  383 |   });
  384 |   await tools.getByLabel("Preview date", { exact: true }).fill("2026-09-30");
  385 |   await page.keyboard.press("Escape");
  386 |   await expect(
  387 |     section(page, "Reports This Month").getByRole("img", {
  388 |       name: "1 approved, 0 in review, 1 draft reports in September 2026",
  389 |       exact: true,
  390 |     }),
  391 |   ).toBeVisible();
  392 |   await expect(section(page, "Reports This Month")).toContainText("1 / 2");
  393 |   await page.goto("/design-preview/report-edit");
  394 |   await page
  395 |     .getByLabel("Coach commentary", { exact: true })
  396 |     .fill("September source remains under coach review.");
  397 |   await page
  398 |     .getByRole("button", { name: "Save report draft", exact: true })
  399 |     .click();
  400 |   await page.goto("/design-preview/coach-today");
  401 |   await expect(
  402 |     section(page, "Reports This Month").getByRole("img", {
  403 |       name: "0 approved, 0 in review, 2 draft reports in September 2026",
  404 |       exact: true,
  405 |     }),
  406 |   ).toBeVisible();
> 407 |   await toolsButton(page).click();
      |                           ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  408 |   await tools.getByLabel("Preview date", { exact: true }).fill("2026-10-20");
  409 |   await page.keyboard.press("Escape");
  410 |   await expect(section(page, "Recent Activity")).not.toContainText(
  411 |     /payment received|attended.*training|hours? ago/i,
  412 |   );
  413 |   await page.goto("/design-preview/conversation");
  414 |   await page
  415 |     .getByLabel("Private message", { exact: true })
  416 |     .fill("Could you explain the first receiving task?");
  417 |   await page
  418 |     .getByRole("button", { name: "Save prototype message", exact: true })
  419 |     .click();
  420 |   await page.goto("/design-preview/coach-today");
  421 |   await expect(page.getByTestId("home-messages")).toContainText(
  422 |     "Read status not recorded",
  423 |   );
  424 |   await expect(page.getByTestId("home-messages")).toContainText(
  425 |     /1\s+parent question/i,
  426 |   );
  427 |   await section(page, "Pending Actions")
  428 |     .getByRole("link", { name: /Open parent questions/ })
  429 |     .click();
  430 |   await expect(page).toHaveURL(/design-preview\/parent-questions/);
  431 |   await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
  432 |     "aarav",
  433 |   );
  434 |   await expect(page.locator(".dp-chat")).toContainText(
  435 |     "Could you explain the first receiving task?",
  436 |   );
  437 |   expect(errors).toEqual([]);
  438 |   expect(businessCalls).toEqual([]);
  439 | });
  440 |
  441 | test("Home opens the second scheduled date and keeps a genuine no-session day honest", async ({
  442 |   page,
  443 | }) => {
  444 |   const { errors, businessCalls } = recordRequests(page);
  445 |   await mkdir(captureFolder, { recursive: true });
  446 |   await page.goto("/design-preview/coach-today");
  447 |   await toolsButton(page).click();
  448 |   const dialog = page.getByRole("dialog", {
  449 |     name: "Preview tools",
  450 |     exact: true,
  451 |   });
  452 |   await dialog.getByLabel("Preview date", { exact: true }).fill("2026-10-21");
  453 |   await page.keyboard.press("Escape");
  454 |   await expect(page.locator(".hd-hero")).toContainText("No session scheduled");
  455 |   await expect(
  456 |     page.getByRole("link", { name: "Start Session", exact: true }),
  457 |   ).toHaveCount(0);
  458 |   await expect(
  459 |     page.getByTestId("home-upcoming").getByText("1", { exact: true }),
  460 |   ).toBeVisible();
  461 |   for (const width of [1536, 390]) {
  462 |     await page.setViewportSize({ width, height: width === 1536 ? 1024 : 844 });
  463 |     await page.screenshot({
  464 |       path: `${captureFolder}/home-no-session-${width}.png`,
  465 |       fullPage: true,
  466 |     });
  467 |   }
  468 |   await toolsButton(page).click();
  469 |   await dialog.getByLabel("Preview date", { exact: true }).fill("2026-10-22");
  470 |   await page.keyboard.press("Escape");
  471 |   await section(page, "Today’s Schedule")
  472 |     .getByRole("link", { name: /U10 Foundations Training Session/ })
  473 |     .click();
  474 |   await expect(page).toHaveURL(/design-preview\/session-agenda/);
  475 |   await expect(page.locator("main")).toContainText("22 October");
  476 |   await expect(page.locator("main")).not.toContainText("20 October");
  477 |   await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
  478 |     "aarav",
  479 |   );
  480 |   await page.goto("/design-preview/coach-today");
  481 |   await page.getByRole("link", { name: "Start Session", exact: true }).click();
  482 |   await expect(page.locator("main")).toContainText("22 October");
  483 |   await page.goto("/design-preview/coach-today");
  484 |   await section(page, "Today’s Schedule")
  485 |     .getByRole("link", { name: "View Calendar", exact: true })
  486 |     .click();
  487 |   await page
  488 |     .locator(".dp-row")
  489 |     .filter({ hasText: "22 October" })
  490 |     .getByRole("link", { name: "View details", exact: true })
  491 |     .click();
  492 |   await expect(page).toHaveURL(/design-preview\/session-summary/);
  493 |   await expect(page.locator("main")).toContainText("22 October");
  494 |   await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
  495 |     "aarav",
  496 |   );
  497 |   await page.goto("/design-preview/sessions");
  498 |   await page
  499 |     .locator(".dp-row")
  500 |     .filter({ hasText: "20 October" })
  501 |     .getByRole("link", { name: "Open session", exact: true })
  502 |     .click();
  503 |   await expect(page).toHaveURL(/design-preview\/session-summary/);
  504 |   await expect(page.locator("main")).toContainText("20 October");
  505 |   await expect(page.locator("main")).not.toContainText("22 October");
  506 |   await expect(page.getByLabel("Player context", { exact: true })).toHaveValue(
  507 |     "aarav",
```
