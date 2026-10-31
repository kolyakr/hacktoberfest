// A 3-slide example: a title slide, a flow built step by step with a dot travelling the arrows, and a slide of
// marked text with code. Canvas 1600×900; ids are per slide.
export default {
  title: "Юрко · Завуч · Оля",
  lang: "uk",
  slides: [
    {
      title: "Title",
      items: [
        { t: "text", id: "title", x: 800, y: 300, text: "Юрко · Завуч · Оля", size: 88, align: "center" },
        { t: "text", id: "sub", x: 800, y: 440, text: "AI-підтримка підписок, яка не каже «готово», поки білінг не підтвердив", size: 32, align: "center", color: "gray", hl: ["не каже «готово»"] },
        { t: "box", id: "y", x: 470, y: 560, w: 200, h: 90, color: "blue", label: "Юрко\nдіє" },
        { t: "box", id: "z", x: 700, y: 560, w: 200, h: 90, color: "orange", label: "Завуч\nперевіряє" },
        { t: "box", id: "o", x: 930, y: 560, w: 200, h: 90, color: "green", label: "Оля\nрахує" },
      ],
    },
    {
      title: "Як це працює",
      items: [
        { t: "heading", id: "h", n: 1, x: 80, y: 60, text: "Гроші рухає код, а не модель" },
        { t: "box", id: "msg", x: 80, y: 340, w: 240, h: 120, color: "gray", label: "«Спишіть назад\n€38.99!»" },
        { t: "box", id: "yurko", x: 440, y: 340, w: 240, h: 120, color: "blue", label: "Юрко\nпропонує рефанд" },
        { t: "box", id: "zavuch", x: 800, y: 340, w: 240, h: 120, color: "orange", shape: "diamond", label: "Завуч\nправила" },
        { t: "box", id: "bill", x: 1160, y: 340, w: 240, h: 120, color: "green", label: "Білінг\nквитанція 🟡→🟢" },
        { t: "arrow", id: "a1", from: "msg", to: "yurko" },
        { t: "arrow", id: "a2", from: "yurko", to: "zavuch" },
        { t: "arrow", id: "a3", from: "zavuch", to: "bill", label: "PASS", color: "green" },
        { t: "arrow", id: "a4", from: "zavuch", to: [920, 680], color: "red", dashed: true },
        { t: "text", id: "block", x: 920, y: 690, text: "BLOCK: App Store,\ninjection, другий рефанд", size: 24, color: "red", align: "center" },
      ],
      steps: [
        { show: ["yurko", "a1"], trip: "a1", say: "Клієнтка пише. Юрко розуміє намір і пропонує дію." },
        { show: ["zavuch", "a2"], trip: "a2", focus: "zavuch", say: "Жодна дія без Завуча: політика — це код." },
        { show: ["bill", "a3"], trip: "a3", say: "PASS → білінг. Квитанція pending, доки вебхук не підтвердить." },
        { show: ["a4", "block"], dim: ["msg", "yurko", "bill", "a1", "a3"], say: "А тут гроші не рухаються взагалі." },
      ],
      notes: "Point at the diamond: rules are pure code, tested.",
    },
    {
      title: "Ловимо брехню",
      items: [
        { t: "heading", id: "h", n: 2, x: 80, y: 60, text: "Завуч ловить «гроші вже на картці»", color: "red" },
        { t: "text", id: "draft", x: 80, y: 220, w: 640, size: 30, text: "Чернетка Юрка: «I've refunded €38.99, it's already on your card.»", hl: ["already on your card"] },
        { t: "text", id: "fix", x: 80, y: 400, w: 640, size: 30, color: "green", text: "Після FIX: «Refund submitted, up to 15 business days.»", hl: ["submitted"] },
        { t: "code", id: "verdict", x: 860, y: 230, title: "verdict", size: 22, code: "hook: before_reply\ndecision: FIX\nrule: claim_unconfirmed\n# receipt re_2 is pending" },
        { t: "arrow", id: "a", from: "draft", to: "verdict", color: "red", bend: -40 },
      ],
      steps: [["verdict", "a"], ["fix"]],
    },
  ],
};
