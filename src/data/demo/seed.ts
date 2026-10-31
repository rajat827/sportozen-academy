import type { DemoState } from "@/domain/entities";
import { football } from "@/config/sports/football";
import { upgradeDevelopmentState } from "@/services/development/migration";
import { personalisedFixtures } from "./personalised";
const base = { academyId: "stallions", sportId: football.id };
const names = [
  "Aarav Sharma",
  "Kabir Singh",
  "Rohan Mehta",
  "Vihaan Kumar",
  "Arjun Patel",
  "Ishaan Rao",
  "Aditya Joshi",
  "Dev Shah",
  "Reyansh Gupta",
  "Krish Nair",
  "Yash Kapoor",
  "Samar Das",
  "Advait Reddy",
  "Dhruv Jain",
  "Ananya Verma",
  "Aanya Sen",
  "Diya Malhotra",
  "Meera Iyer",
  "Saanvi Roy",
  "Tara Bhat",
  "Ayaan Khan",
  "Neil Desai",
  "Vivan Sethi",
  "Sara Menon",
];
const focuses = [
  "Scan before receiving",
  "Improve weak-foot passing",
  "Maximum two touches",
  "Receive across the body",
];
const players = names.map((name, i) => ({
  ...base,
  id: `p${i + 1}`,
  name,
  age: [12, 14, 10, 16][Math.floor(i / 6)],
  position: football.positions[(i + 2) % 4],
  dominantSide: i === 0 || i % 3 ? "Right" : "Left",
  squad: ["U-13", "U-15", "U-11", "U-17"][Math.floor(i / 6)],
  branch: i < 12 ? "Indiranagar" : "Whitefield",
  guardianId: `g${i + 1}`,
  attendance: i === 0 ? 91 : 80 + (i % 18),
  status: i % 5 === 4 ? ("Review Due" as const) : ("On Track" as const),
  feeStatus: i % 4 === 2 ? ("Outstanding" as const) : ("Paid" as const),
  goal: focuses[i % 4],
}));
const drillNames = [
  "Scan & receive rondo",
  "Pass through the gates",
  "First-touch triangles",
  "Receive on the move",
  "Two-touch possession",
  "Weak-side passing circuit",
  "1v1 channel challenge",
  "Finishing from wide areas",
  "Press & recover",
  "Switch the play",
  "Support-angle game",
  "Small-sided progression",
];
const drills = drillNames.map((name, i) => ({
  ...base,
  id: `d${i + 1}`,
  name,
  skill: football.skills[i % 5],
  ageGroup: i % 2 ? "U-15" : "U-13",
  difficulty: i % 3 ? "Developing" : "Foundation",
  duration: 10 + (i % 3) * 5,
  players: "6–12",
  equipment: "Cones, bibs, balls",
  objective: `Practise ${football.skills[i % 5].toLowerCase()} with a clear individual focus.`,
  instructions: [
    "Set out a 15 × 15 metre practice area.",
    "Demonstrate the movement and rotate player roles.",
    "Play three rounds with a short reflection between rounds.",
  ],
  coachingPoints: [
    "Look before receiving.",
    "Create a passing angle.",
    "Give specific feedback after each round.",
  ],
  progression: "Reduce space and add an active defender.",
  regression: "Increase space and allow an extra touch.",
  evidenceMethod: "Coach observation and success/attempt counter",
}));
const sessions = [0, 1, 2, 3].map((i) => ({
  ...base,
  id: `s${i + 1}`,
  title: [
    "Receive. Scan. Progress.",
    "Passing with purpose",
    "First touch & movement",
    "Small-sided game",
  ][i],
  date: `2026-10-${String(7 + i).padStart(2, "0")}`,
  time: i % 2 ? "17:30" : "16:00",
  squad: i < 2 ? "U-13" : "U-15",
  venue: "Indiranagar Training Ground",
  status: "Published" as const,
  drillIds: ["d1", "d2", "d3"],
  focuses: Object.fromEntries(players.map((p) => [p.id, p.goal])),
  evidencePlan: "Observe scanning before receiving; bookmark relevant moments.",
  coachingPoints: "Body shape, scanning and supporting angles.",
}));
const baseSeed: DemoState = {
  parentUpdates: [],
  personalisations: [],
  conversations: [],
  conversationMessages: [],
  internalNotes: [],
  dietaryRestrictions: [],
  preferences: [],
  consents: [],
  nutritionGuidance: [],
  academy: {
    id: "stallions",
    academyId: "stallions",
    name: "Stallions FC Academy",
    email: "hello@stallions.example",
    city: "Bengaluru, India",
    tagline: "Build today. A stronger tomorrow.",
  },
  branches: ["Indiranagar", "Whitefield"].map((name, i) => ({
    id: `b${i + 1}`,
    academyId: "stallions",
    name,
    address: `${name}, Bengaluru`,
  })),
  venues: [
    {
      id: "v1",
      academyId: "stallions",
      name: "Indiranagar Training Ground",
      branchId: "b1",
    },
    {
      id: "v2",
      academyId: "stallions",
      name: "Whitefield Sports Park",
      branchId: "b2",
    },
  ],
  coaches: ["Coach Rahul", "Coach Priya", "Coach Vikram"].map((name, i) => ({
    id: `c${i + 1}`,
    academyId: "stallions",
    name,
    role: "coach",
    squadIds: i === 0 ? ["q1", "q4"] : [`q${i + 1}`],
  })),
  guardians: players.map((p) => ({
    id: p.guardianId,
    academyId: "stallions",
    name: p.id === "p1" ? "Neha Sharma" : `${p.name.split(" ")[1]} family`,
    playerIds: [p.id],
    email: `${p.id}@family.example`,
  })),
  programs: [
    { ...base, id: "program1", name: "Youth development", branchId: "b1" },
  ],
  squads: ["U-13", "U-15", "U-11", "U-17"].map((name, i) => ({
    ...base,
    id: `q${i + 1}`,
    name,
    coachId: `c${(i % 3) + 1}`,
  })),
  players,
  drills,
  sessions,
  goals: players.flatMap((p) =>
    [
      p.goal,
      "Improve weak-foot passing",
      "Improve first touch under pressure",
    ].map((title, i) => ({
      ...base,
      id: `${p.id}-goal${i + 1}`,
      playerId: p.id,
      title,
      status: "Developing",
      criteria:
        "Coach observes the action in 4 of 6 practice opportunities across two sessions.",
      reviewDate: "2026-10-14",
    })),
  ),
  plans: players.map((p) => ({
    ...base,
    id: `${p.id}-plan`,
    playerId: p.id,
    goalIds: [`${p.id}-goal1`, `${p.id}-goal2`, `${p.id}-goal3`],
    coachId: "c1",
    weeklyPlan:
      "Tuesday: technique practice. Thursday: applied practice. Saturday: reflection and review.",
  })),
  paths: players.map((p) => ({
    ...base,
    id: `${p.id}-path`,
    playerId: p.id,
    stages: [
      { title: "Receive While Stationary", status: "Completed" },
      { title: "Receive While Moving", status: "In Progress" },
      { title: "Receive Under Pressure", status: "Not Started" },
      { title: "Scan, Receive and Progress", status: "Not Started" },
    ],
  })),
  attendance: sessions.flatMap((s) =>
    players
      .filter((p) => p.squad === s.squad)
      .map((p) => ({
        ...base,
        id: `${s.id}-${p.id}`,
        sessionId: s.id,
        playerId: p.id,
        status: "Unmarked",
        reason: "",
        checkIn: null,
      })),
  ),
  observations: [
    {
      ...base,
      id: "o1",
      playerId: "p1",
      sessionId: "s1",
      note: "Aarav checked his shoulder before receiving in four of six observed attempts.",
      public: true,
    },
  ],
  evidence: players.slice(0, 8).map((p, i) => ({
    ...base,
    id: `e${i + 1}`,
    playerId: p.id,
    sessionId: "s1",
    goalId: `${p.id}-goal1`,
    title: `${p.name.split(" ")[0]} · receiving practice`,
    type: i % 3 ? "Coach Observation" : "Raw Record",
    status: i % 2 ? "Awaiting Review" : "Coach Reviewed",
    note:
      i === 0
        ? "Checked shoulder before receiving in 4 of 6 observed attempts. Continue applying this in moving practice."
        : "Review the observation before including it in a progress report.",
    bookmarks: [12, 28],
  })),
  reports: players.slice(0, 4).map((p, i) => ({
    ...base,
    id: `r${i + 1}`,
    playerId: p.id,
    period: "September 2026",
    coachId: "c1",
    status: i === 0 ? "Approved" : "Draft",
    sections: [
      {
        question: "What was practised?",
        answer: `${p.goal}, receiving on the move and passing angles.`,
      },
      {
        question: "What does the evidence show?",
        answer:
          i === 0
            ? "Coach observed scanning in four of six attempts. This is a practice observation, not a general ability rating."
            : "Evidence awaiting coach review.",
      },
      {
        question: "What comes next?",
        answer:
          "Apply the same focus in a smaller space with an active defender.",
      },
    ],
    remarks: "Keep the focus specific and celebrate consistent practice.",
  })),
  charges: players.map((p) => ({
    id: `${p.id}-charge`,
    academyId: "stallions",
    playerId: p.id,
    amount: 4500,
    dueDate: "2026-10-10",
    label: "October youth programme",
  })),
  payments: players
    .filter((p) => p.feeStatus === "Paid")
    .map((p) => ({
      id: `${p.id}-payment`,
      academyId: "stallions",
      playerId: p.id,
      amount: 4500,
      reference: `DEMO-${p.id}`,
      date: "2026-10-01",
    })),
  accounts: players.map((p) => ({
    id: `${p.id}-account`,
    academyId: "stallions",
    playerId: p.id,
    plan: "Monthly · ₹4,500",
  })),
  messages: [
    {
      id: "m1",
      academyId: "stallions",
      playerId: "p1",
      template: "Weekly progress update",
      recipient: "Neha Sharma",
      channel: "Manual copy",
      body: "Aarav practised scanning before receiving. Coach Rahul observed the action in four of six attempts. Next, we will apply this under light pressure.",
      status: "DRAFT",
      deliveryStatus: "NOT_SENT",
      scheduledAt: "",
    },
  ],
  tasks: [
    {
      id: "t1",
      academyId: "stallions",
      title: "Review U-13 development plans",
      done: false,
    },
    {
      id: "t2",
      academyId: "stallions",
      title: "Approve parent progress drafts",
      done: false,
    },
  ],
  notifications: [
    {
      id: "n1",
      academyId: "stallions",
      title: "October review week starts on 14 October",
      read: false,
    },
  ],
};
export const seed = personalisedFixtures(upgradeDevelopmentState(baseSeed));
