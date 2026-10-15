# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: approved-visual.spec.ts >> approved-reference screens preserve controls, context and narrow usability
- Location: tests\e2e\approved-visual.spec.ts:4:5

# Error details

```
TimeoutError: locator.click: Timeout 15000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Save batch plan', exact: true })
    - locator resolved to <button type="submit" class="button primary">Save batch plan</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable

```

# Page snapshot

```yaml
- generic [ref=f6e1]:
  - generic [ref=f6e2]:
    - link "Skip to preview content" [ref=f6e3] [cursor=pointer]:
      - /url: "#preview-content"
    - generic [ref=f6e4]: Design preview — fictional data; no payments or messages are processed.
    - generic [ref=f6e5]:
      - complementary [ref=f6e6]:
        - link "S Riverside Football Academy Football academy · fictional" [ref=f6e7] [cursor=pointer]:
          - /url: /design-preview/coach-today
          - generic [ref=f6e8]: S
          - generic [ref=f6e9]:
            - strong [ref=f6e10]: Riverside Football Academy
            - generic [ref=f6e11]: Football academy · fictional
        - navigation "Preview workspace navigation" [ref=f6e12]:
          - link "Home" [ref=f6e13] [cursor=pointer]:
            - /url: /design-preview/coach-today
          - link "Calendar" [ref=f6e17] [cursor=pointer]:
            - /url: /design-preview/sessions
          - link "Sessions" [ref=f6e20] [cursor=pointer]:
            - /url: /design-preview/session-agenda
          - link "Players" [ref=f6e24] [cursor=pointer]:
            - /url: /design-preview/players
          - link "Drills Library" [ref=f6e30] [cursor=pointer]:
            - /url: /design-preview/drill-library
          - link "Reports" [ref=f6e33] [cursor=pointer]:
            - /url: /design-preview/report-queue
          - link "Messages" [ref=f6e37] [cursor=pointer]:
            - /url: /design-preview/parent-questions
          - link "Academy" [ref=f6e40] [cursor=pointer]:
            - /url: /design-preview/coach-more
          - link "Settings" [ref=f6e45] [cursor=pointer]:
            - /url: /design-preview/coach-more
        - link "AI Video Analysis · Coming soon" [ref=f6e49] [cursor=pointer]:
          - /url: /design-preview/ai-coming-soon
        - generic [ref=f6e50]:
          - text: Powered by SportozenReview set · awaiting your approval
          - link "All screens & states" [ref=f6e51] [cursor=pointer]:
            - /url: /design-preview
          - link "Reference prototype" [ref=f6e52] [cursor=pointer]:
            - /url: /design-preview/prototype
      - main [ref=f6e53]:
        - generic [ref=f6e54]:
          - generic [ref=f6e55]:
            - text: Academy fixture
            - combobox "Academy fixture" [ref=f6e56]:
              - option "Riverside Football Academy" [selected]
              - option "Harbour Football Academy"
          - generic [ref=f6e57]:
            - text: Role preview
            - combobox "Role preview" [ref=f6e58]:
              - option "OWNER"
              - option "COACH" [selected]
              - option "PARENT"
              - option "PLATFORM"
              - option "ACCESS"
          - generic [ref=f6e59]:
            - text: Player context
            - combobox "Player context" [ref=f6e60]:
              - option "Aarav Shah" [selected]
              - option "Isha Kapoor"
              - option "Leo Shah"
          - generic [ref=f6e61]:
            - text: Design scenario
            - combobox "Design scenario" [ref=f6e62]:
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
          - link "Screen gallery" [ref=f6e63] [cursor=pointer]:
            - /url: /design-preview
          - link "Prototype home" [ref=f6e64] [cursor=pointer]:
            - /url: /design-preview/prototype
          - button "Reset fictional preview" [ref=f6e65] [cursor=pointer]
        - generic [ref=f6e66]:
          - generic [ref=f6e67]:
            - paragraph [ref=f6e68]: Weekly / COACH · weekly-plan
            - heading "Weekly Plan" [level=1] [ref=f6e69]
            - paragraph [ref=f6e70]: U10 Foundations · Week of 19 October · 20 and 22 October, 17:30.
          - generic [ref=f6e71]: Default
        - generic [ref=f6e72]:
          - generic [ref=f6e73]:
            - link "1 Plan Sessions Set the team focus and activities" [ref=f6e74] [cursor=pointer]:
              - /url: /design-preview/weekly-plan
              - generic [ref=f6e75]: "1"
              - generic [ref=f6e76]:
                - strong [ref=f6e77]: Plan Sessions
                - generic [ref=f6e78]: Set the team focus and activities
            - link "2 Personalise for Players Adjust only where needed" [ref=f6e79] [cursor=pointer]:
              - /url: /design-preview/personalisation
              - generic [ref=f6e80]: "2"
              - generic [ref=f6e81]:
                - strong [ref=f6e82]: Personalise for Players
                - generic [ref=f6e83]: Adjust only where needed
            - link "3 Review & Publish Approve wording, then publish in-app" [ref=f6e84] [cursor=pointer]:
              - /url: /design-preview/weekly-approval
              - generic [ref=f6e85]: "3"
              - generic [ref=f6e86]:
                - strong [ref=f6e87]: Review & Publish
                - generic [ref=f6e88]: Approve wording, then publish in-app
          - generic [ref=f6e89]:
            - generic [ref=f6e90]:
              - generic [ref=f6e91]:
                - heading "Team Focus" [level=2] [ref=f6e92]
                - button "Edit team focus" [ref=f6e93] [cursor=pointer]
              - generic [ref=f6e97]:
                - generic [ref=f6e98]:
                  - generic [ref=f6e99]:
                    - text: Batch
                    - combobox "Batch" [ref=f6e100]:
                      - option "U10 Foundations" [selected]
                      - option "U12 Development"
                  - generic [ref=f6e101]:
                    - text: Week starting
                    - textbox "Week starting" [ref=f6e102]: 2026-10-19
                - generic [ref=f6e103]:
                  - text: Shared batch focus
                  - textbox "Shared batch focus" [active] [ref=f6e104]: Receive through the wide gate
                - text: Unsaved changes
                - generic [ref=f6e105]:
                  - button "Save batch plan" [ref=f6e106] [cursor=pointer]
                  - button "Reuse previous plan" [ref=f6e107] [cursor=pointer]
              - generic [ref=f6e108]:
                - heading "Sessions (2)" [level=2] [ref=f6e109]
                - link "Build session" [ref=f6e110] [cursor=pointer]:
                  - /url: /design-preview/session-builder
              - generic [ref=f6e111]:
                - article [ref=f6e112]:
                  - generic [ref=f6e115]:
                    - strong [ref=f6e116]: 20 October
                    - paragraph [ref=f6e117]: 17:30–18:30 · North pitch · Riverside ground
                    - paragraph [ref=f6e118]: Receive and turn
                    - link "Open session" [ref=f6e119] [cursor=pointer]:
                      - /url: /design-preview/session-summary
                - article [ref=f6e120]:
                  - generic [ref=f6e123]:
                    - strong [ref=f6e124]: 22 October
                    - paragraph [ref=f6e125]: 17:30–18:30 · North pitch · Riverside ground
                    - paragraph [ref=f6e126]: Pass and move
                    - link "Open session" [ref=f6e127] [cursor=pointer]:
                      - /url: /design-preview/session-summary
                - generic [ref=f6e128]: 20 October and 22 October · Asia/Kolkata
            - generic [ref=f6e129]:
              - generic [ref=f6e130]:
                - heading "Players (2)" [level=2] [ref=f6e131]
                - generic [ref=f6e132]: Approved
              - text: Player · age category · personal focus
              - generic [ref=f6e133]:
                - generic [ref=f6e134]: AS
                - generic [ref=f6e135]:
                  - strong [ref=f6e136]: Aarav Shah
                  - paragraph [ref=f6e137]: U10 age category · U10 Foundations
                  - paragraph [ref=f6e138]: Open body position before receiving
                  - generic [ref=f6e139]: Personalised adjustment
                - button "Select Aarav" [ref=f6e140] [cursor=pointer]
              - generic [ref=f6e141]:
                - generic [ref=f6e142]: IK
                - generic [ref=f6e143]:
                  - strong [ref=f6e144]: Isha Kapoor
                  - paragraph [ref=f6e145]: U10 age category · U10 Foundations
                  - paragraph [ref=f6e146]: Individual focus not yet set
                  - generic [ref=f6e147]: Following batch plan
                - button "Select Isha" [ref=f6e148] [cursor=pointer]
              - generic [ref=f6e149]:
                - button "Personalise selected player" [ref=f6e150] [cursor=pointer]
                - button "Adjust selected group" [ref=f6e151] [cursor=pointer]
              - generic [ref=f6e152]:
                - heading "Session activities" [level=3] [ref=f6e153]
                - link "Choose drills" [ref=f6e154] [cursor=pointer]:
                  - /url: /design-preview/weekly-drills
              - generic [ref=f6e155]:
                - article [ref=f6e156]:
                  - generic [ref=f6e157]: "1"
                  - generic [ref=f6e158]:
                    - strong [ref=f6e159]: Receive and turn
                    - paragraph [ref=f6e160]: 15 min · Look, open, receive
                - article [ref=f6e161]:
                  - generic [ref=f6e162]: "2"
                  - generic [ref=f6e163]:
                    - strong [ref=f6e164]: Pass and move
                    - paragraph [ref=f6e165]: 20 min · Pass, find space, show
                - article [ref=f6e166]:
                  - generic [ref=f6e167]: "3"
                  - generic [ref=f6e168]:
                    - strong [ref=f6e169]: Small-sided gate game
                    - paragraph [ref=f6e170]: 20 min · Find the free gate
            - generic [ref=f6e171]:
              - heading "Preview for Parents" [level=2] [ref=f6e172]
              - generic [ref=f6e173]:
                - generic [ref=f6e174]:
                  - generic [ref=f6e175]: S
                  - text: Riverside Football Academy
                - heading "Aarav’s plan · 2026-10-19" [level=3] [ref=f6e176]
                - paragraph [ref=f6e177]: "This week, U10 Foundations will practise:"
                - strong [ref=f6e178]: Receive into space, then find the next pass
                - paragraph [ref=f6e179]: "Personal focus: Open body position before receiving"
                - paragraph [ref=f6e180]: 2 confirmed training sessions
                - paragraph [ref=f6e183]: Receive and turn · Pass and move · Small-sided gate game
                - paragraph [ref=f6e188]: 17:30–18:30
                - paragraph [ref=f6e192]: North pitch · Riverside ground
                - generic [ref=f6e196]: Wording approved
                - paragraph [ref=f6e197]: Selected child belongs to this batch.
              - paragraph [ref=f6e198]: Editable preview. Approval and parent-app publication are separate. WhatsApp is not connected.
              - link "Review parent plans" [ref=f6e199] [cursor=pointer]:
                - /url: /design-preview/weekly-approval
              - link "Preview WhatsApp wording" [ref=f6e202] [cursor=pointer]:
                - /url: /design-preview/whatsapp-preview
              - generic [ref=f6e203]: Published in fictional parent app
  - alert [ref=f6e207]
```

# Test source

```ts
  43  |         .evaluate(
  44  |           (img: HTMLImageElement) => img.complete && img.naturalWidth > 0,
  45  |         ),
  46  |     ).toBe(true);
  47  |     await page.screenshot({
  48  |       path: `${folder}/${screen}-${width}.png`,
  49  |       fullPage: true,
  50  |     });
  51  |     if (screen === "coach-today")
  52  |       await expect(
  53  |         page.getByRole("link", { name: "Start Session", exact: true }),
  54  |       ).toBeVisible();
  55  |     else {
  56  |       if (width === 320) {
  57  |         const last = page.locator(".ar-shortcuts a").last();
  58  |         await last.scrollIntoViewIfNeeded();
  59  |         await page.keyboard.press("End");
  60  |         await expect
  61  |           .poll(async () => {
  62  |             const shortcut = await last.boundingBox(),
  63  |               navigation = await page.locator(".ar-bottom-nav").boundingBox();
  64  |             return shortcut!.y + shortcut!.height - navigation!.y;
  65  |           })
  66  |           .toBeLessThanOrEqual(0);
  67  |         await page.screenshot({ path: `${folder}/parent-home-320-bottom.png` });
  68  |       }
  69  |       await page
  70  |         .getByLabel("Player context", { exact: true })
  71  |         .selectOption("leo");
  72  |       await expect(page.locator("main")).toContainText(
  73  |         "No confirmed current-week session",
  74  |       );
  75  |       await expect(page.locator(".ar-update")).toContainText("Not recorded");
  76  |       await page
  77  |         .getByLabel("Player context", { exact: true })
  78  |         .selectOption("aarav");
  79  |     }
  80  |   }
  81  |   await page.setViewportSize({ width: 1440, height: 900 });
  82  |   await page.goto("/design-preview/coach-today");
  83  |   await page
  84  |     .getByRole("button", {
  85  |       name: "Preview context & screen gallery",
  86  |       exact: true,
  87  |     })
  88  |     .click();
  89  |   await expect(
  90  |     page.getByLabel("Review academy fixture", { exact: true }),
  91  |   ).toBeVisible();
  92  |   await page
  93  |     .getByLabel("Design scenario", { exact: true })
  94  |     .selectOption("loading");
  95  |   await page
  96  |     .getByRole("button", {
  97  |       name: "Preview context & screen gallery",
  98  |       exact: true,
  99  |     })
  100 |     .click();
  101 |   await expect(
  102 |     page.getByText("Loading fictional records…", { exact: true }),
  103 |   ).toBeVisible();
  104 |   await page
  105 |     .getByLabel("Design scenario", { exact: true })
  106 |     .selectOption("default");
  107 |   await page
  108 |     .getByRole("button", {
  109 |       name: "Preview context & screen gallery",
  110 |       exact: true,
  111 |     })
  112 |     .click();
  113 |   await page.getByLabel("Role preview", { exact: true }).selectOption("PARENT");
  114 |   await expect(page).toHaveURL(/parent-home/);
  115 |   await page
  116 |     .getByRole("button", {
  117 |       name: "Preview context & screen gallery",
  118 |       exact: true,
  119 |     })
  120 |     .click();
  121 |   await page.getByLabel("Role preview", { exact: true }).selectOption("COACH");
  122 |   await expect(page).toHaveURL(/coach-today/);
  123 |   await page
  124 |     .getByLabel("Search players, sessions, messages", { exact: true })
  125 |     .fill("Aarav");
  126 |   await page
  127 |     .getByRole("button", { name: "Open player search", exact: true })
  128 |     .click();
  129 |   await expect(page).toHaveURL(/player-profile/);
  130 |   await expect(page.locator("main")).toContainText("Aarav Shah");
  131 |   await page.goto("/design-preview/coach-today");
  132 |   await page.getByRole("link", { name: "Start Session", exact: true }).click();
  133 |   await expect(page).toHaveURL(/session-agenda/);
  134 |   await page.goto("/design-preview/weekly-plan");
  135 |   await page
  136 |     .getByRole("button", { name: "Edit team focus", exact: true })
  137 |     .click();
  138 |   await page
  139 |     .getByLabel("Shared batch focus", { exact: true })
  140 |     .fill("Receive through the wide gate");
  141 |   await page
  142 |     .getByRole("button", { name: "Save batch plan", exact: true })
> 143 |     .click();
      |      ^ TimeoutError: locator.click: Timeout 15000ms exceeded.
  144 |   await page.goto("/design-preview/parent-home");
  145 |   await expect(page.locator("main")).toContainText(
  146 |     "Your plan is awaiting coach review",
  147 |   );
  148 |   await page.goto("/design-preview/coach-more");
  149 |   await expect(page.locator(".approved-review")).toHaveCount(0);
  150 |   expect(errors).toEqual([]);
  151 |   expect(calls).toEqual([]);
  152 | });
  153 | 
```