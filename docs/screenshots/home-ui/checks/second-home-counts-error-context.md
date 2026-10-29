# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: home-ui.spec.ts >> Home summary values agree with recorded data and do not invent unread or current-month reports
- Location: tests\e2e\home-ui.spec.ts:355:5

# Error details

```
TimeoutError: locator.fill: Timeout 15000ms exceeded.
Call log:
  - waiting for getByLabel('Coach commentary', { exact: true })

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e2]:
    - link "Skip to preview content" [ref=f1e3] [cursor=pointer]:
      - /url: "#preview-content"
    - generic [ref=f1e4]: Design preview — fictional data; no payments or messages are processed.
    - generic [ref=f1e5]:
      - complementary [ref=f1e6]:
        - link "S Riverside Football Academy Football academy · fictional" [ref=f1e7] [cursor=pointer]:
          - /url: /design-preview/coach-today
          - generic [ref=f1e8]: S
          - generic [ref=f1e9]:
            - strong [ref=f1e10]: Riverside Football Academy
            - generic [ref=f1e11]: Football academy · fictional
        - navigation "Preview workspace navigation" [ref=f1e12]:
          - link "Home" [ref=f1e13] [cursor=pointer]:
            - /url: /design-preview/coach-today
          - link "Calendar" [ref=f1e17] [cursor=pointer]:
            - /url: /design-preview/sessions
          - link "Sessions" [ref=f1e20] [cursor=pointer]:
            - /url: /design-preview/session-agenda
          - link "Players" [ref=f1e24] [cursor=pointer]:
            - /url: /design-preview/players
          - link "Drills Library" [ref=f1e30] [cursor=pointer]:
            - /url: /design-preview/drill-library
          - link "Reports" [ref=f1e33] [cursor=pointer]:
            - /url: /design-preview/report-queue
          - link "Messages" [ref=f1e37] [cursor=pointer]:
            - /url: /design-preview/parent-questions
          - link "Academy" [ref=f1e40] [cursor=pointer]:
            - /url: /design-preview/coach-more
          - link "Settings" [ref=f1e45] [cursor=pointer]:
            - /url: /design-preview/coach-more
        - link "AI Video Analysis · Coming soon" [ref=f1e49] [cursor=pointer]:
          - /url: /design-preview/ai-coming-soon
        - generic [ref=f1e50]:
          - text: Powered by SportozenReview set · awaiting your approval
          - link "All screens & states" [ref=f1e51] [cursor=pointer]:
            - /url: /design-preview
          - link "Reference prototype" [ref=f1e52] [cursor=pointer]:
            - /url: /design-preview/prototype
      - main [ref=f1e53]:
        - generic [ref=f1e54]:
          - generic [ref=f1e55]:
            - text: Academy fixture
            - combobox "Academy fixture" [ref=f1e56]:
              - option "Riverside Football Academy" [selected]
              - option "Harbour Football Academy"
          - generic [ref=f1e57]:
            - text: Role preview
            - combobox "Role preview" [ref=f1e58]:
              - option "OWNER"
              - option "COACH" [selected]
              - option "PARENT"
              - option "PLATFORM"
              - option "ACCESS"
          - generic [ref=f1e59]:
            - text: Player context
            - combobox "Player context" [ref=f1e60]:
              - option "Aarav Shah" [selected]
              - option "Isha Kapoor"
              - option "Leo Shah"
          - generic [ref=f1e61]:
            - text: Design scenario
            - combobox "Design scenario" [ref=f1e62]:
              - option "default" [selected]
              - option "empty"
              - option "loading"
              - option "validation"
              - option "failed save"
              - option "unsaved"
              - option "conflict"
              - option "archived"
              - option "unavailable media"
              - option "pending template"
              - option "opted out"
              - option "delivery failed"
          - link "Screen gallery" [ref=f1e63] [cursor=pointer]:
            - /url: /design-preview
          - link "Prototype home" [ref=f1e64] [cursor=pointer]:
            - /url: /design-preview/prototype
          - button "Reset fictional preview" [ref=f1e65] [cursor=pointer]
        - generic [ref=f1e66]:
          - generic [ref=f1e67]:
            - paragraph [ref=f1e68]: Reports / COACH · report-edit
            - heading "Coach-reviewed monthly report" [level=1] [ref=f1e69]
            - paragraph [ref=f1e70]: What was practised → What was observed → What comes next.
          - generic [ref=f1e71]: Editor
        - generic [ref=f1e73]:
          - generic [ref=f1e74]:
            - generic [ref=f1e75]:
              - generic [ref=f1e76]:
                - heading "Aarav Shah · September 2026" [level=2] [ref=f1e77]
                - paragraph [ref=f1e78]: What was practised → What was observed → What comes next
              - generic [ref=f1e79]: Approved
            - generic [ref=f1e80]:
              - generic [ref=f1e81]:
                - paragraph [ref=f1e82]: Recorded source basis
                - generic [ref=f1e83]:
                  - paragraph [ref=f1e84]: "3 completed roster sessions: 2 present, 0 absent, 0 excused, 1 unmarked. Attendance basis: present / (present + absent) = 2/2. The unmarked session is excluded from this basis."
                  - paragraph [ref=f1e85]: Fictional September session and attendance records · SEPT-01 · SEPT-08 · SEPT-15
                - generic [ref=f1e86]:
                  - paragraph [ref=f1e87]: The first touch moved into useful space during the paired task. Continue observing this in small-sided play.
                  - paragraph [ref=f1e88]: Coach observation reviewed by Maya Rao · 30 September · OBS-SEPT-08 · paired receiving task · widened gate
                - paragraph [ref=f1e89]: Today’s October observation remains in the session record; it does not enter this September report.
              - generic [ref=f1e90]:
                - generic [ref=f1e91]:
                  - text: Coach commentary
                  - textbox "Coach commentary" [ref=f1e92]: The first touch moved into useful space during the paired task. Continue observing this in small-sided play.
                - button "Save report draft" [ref=f1e93] [cursor=pointer]
                - generic [ref=f1e94]:
                  - checkbox "I reviewed the player, month, attendance basis, sources and commentary" [ref=f1e95]
                  - text: I reviewed the player, month, attendance basis, sources and commentary
                - button "Approve report" [disabled] [ref=f1e96]
                - link "Parent preview" [ref=f1e98] [cursor=pointer]:
                  - /url: /design-preview/parent-report
            - generic [ref=f1e99]:
              - link "Source review" [ref=f1e100] [cursor=pointer]:
                - /url: /design-preview/report-sources
              - link "Edit commentary" [ref=f1e101] [cursor=pointer]:
                - /url: /design-preview/report-edit
              - link "Approval step" [ref=f1e102] [cursor=pointer]:
                - /url: /design-preview/report-approval
            - generic [ref=f1e103]:
              - button "Download PDF" [ref=f1e105] [cursor=pointer]
              - link "Report history" [ref=f1e109] [cursor=pointer]:
                - /url: /design-preview/report-history
            - paragraph [ref=f1e110]: Fictional approved-data PDF; academy attribution and private-source wording remain consistent. Download does not share the report.
          - article "Player development report" [ref=f1e112]:
            - generic [ref=f1e113]:
              - generic [ref=f1e114]:
                - generic [ref=f1e115]: Riverside Football Academy
                - generic [ref=f1e116]: Powered by Sportozen
              - generic [ref=f1e117]:
                - text: September 2026
                - generic [ref=f1e118]: Fictional demo report
            - generic [ref=f1e119]:
              - paragraph [ref=f1e120]: Player Development Report
              - heading "Aarav Shah" [level=2] [ref=f1e121]
              - paragraph [ref=f1e122]: Football · U10 Foundations · Maya Rao
              - generic [ref=f1e123]:
                - generic [ref=f1e124]: "Report status: Approved"
                - generic [ref=f1e125]: "External delivery: Not sent"
            - generic [ref=f1e126]:
              - heading "Current development focus" [level=3] [ref=f1e127]
              - paragraph [ref=f1e128]: Receive the ball into useful space
              - generic [ref=f1e129]:
                - strong [ref=f1e130]: Why this focus
                - paragraph [ref=f1e131]: Coach-reviewed September source records
            - generic [ref=f1e132]:
              - generic [ref=f1e133]:
                - heading "What was practised" [level=3] [ref=f1e134]
                - paragraph [ref=f1e135]: Receive and turn; Pass and move
                - generic [ref=f1e136]:
                  - heading "Receive and turn" [level=4] [ref=f1e137]
                  - paragraph [ref=f1e138]: Practise an open body position and a first touch into space
                - generic [ref=f1e139]:
                  - heading "Pass and move" [level=4] [ref=f1e140]
                  - paragraph [ref=f1e141]: Practise a useful passing angle after moving
              - generic [ref=f1e142]:
                - heading "What the coach observed" [level=3] [ref=f1e143]
                - generic [ref=f1e144]:
                  - paragraph [ref=f1e145]: "3 completed roster sessions: 2 present, 0 absent, 0 excused, 1 unmarked. Attendance basis: present / (present + absent) = 2/2. The unmarked session is excluded from this basis."
                  - generic [ref=f1e146]: "Source: Fictional September session and attendance records"
                  - group [ref=f1e147]:
                    - generic "Evidence details" [ref=f1e148] [cursor=pointer]
                - generic [ref=f1e149]:
                  - paragraph [ref=f1e150]: The first touch moved into useful space during the paired task. Continue observing this in small-sided play.
                  - generic [ref=f1e151]: "Source: Coach observation reviewed by Maya Rao · 30 September"
                  - group [ref=f1e152]:
                    - generic "Evidence details" [ref=f1e153] [cursor=pointer]
            - generic [ref=f1e154]:
              - heading "Next development step" [level=3] [ref=f1e155]
              - paragraph [ref=f1e156]: Repeat the receiving task and observe the first touch before the next pass.
              - paragraph [ref=f1e157]: "Coach will observe: First touch goes toward the free gate"
              - generic [ref=f1e158]: "Review date: 2026-10-31"
            - generic [ref=f1e159]:
              - heading "Coach’s closing note" [level=3] [ref=f1e160]
              - paragraph [ref=f1e161]: Reviewed by Maya Rao on 30 September. Keep practice optional, short and comfortable. Ask the coach if an instruction needs clarification.
            - generic [ref=f1e162]:
              - generic [ref=f1e163]: Aarav Shah · September 2026
              - generic [ref=f1e164]: "Private player development report · Demo data · External delivery: Not sent"
  - alert [ref=f1e165]
```

# Test source

```ts
  296 |     ["failed-save", "error"],
  297 |   ] as const)
  298 |     for (const width of [1536, 390] as const) {
  299 |       await page.setViewportSize({
  300 |         width,
  301 |         height: width === 1536 ? 1024 : 844,
  302 |       });
  303 |       await page.goto(`/design-preview/coach-today?scenario=${scenario}`);
  304 |       await expect(page.locator(".home-dashboard")).toBeVisible();
  305 |       await expect(page.locator(".hd-hero")).toBeVisible();
  306 |       await expect(section(page, "Today’s Schedule")).toBeVisible();
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
> 396 |     .fill("September source remains under coach review.");
      |      ^ TimeoutError: locator.fill: Timeout 15000ms exceeded.
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
  407 |   await toolsButton(page).click();
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
```
