import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  MessageCircle,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { CONSULTATION_URL, GOOGLE_SHEETS_WEB_APP_URL, LINE_HINT_URL } from "./config.js";

const h = React.createElement;

const axes = [
  {
    id: "search",
    label: "探しやすさ",
    icon: Search,
    color: "#2f7651",
    comment:
      "見積書・資料・案件情報の置き場をそろえると、探す時間と属人化が減り、判断が早くなります。",
  },
  {
    id: "communication",
    label: "伝わりやすさ",
    icon: MessageCircle,
    color: "#d71920",
    comment:
      "変更や追加作業の伝達ルートを決めると、「聞いてない」や手戻りが起きにくくなります。",
  },
  {
    id: "standard",
    label: "そろっている度",
    icon: ClipboardCheck,
    color: "#d9882d",
    comment:
      "単価表・チェックリスト・判断ルールを整えると、担当者ごとの見積差や確認待ちを抑えられます。",
  },
  {
    id: "connected",
    label: "つながっている度",
    icon: WalletCards,
    color: "#244f86",
    comment:
      "見積から作業、追加対応、請求まで情報をつなげると、二重入力と請求漏れを防ぎやすくなります。",
  },
  {
    id: "flow",
    label: "進めやすさ",
    icon: Clock3,
    color: "#698f73",
    comment:
      "確認待ち・休み対応・やり直しの詰まりを見える化すると、残業の原因を流れから直せます。",
  },
];

const questions = [
  ["search", "過去の見積書や似た案件をすぐ探せる"],
  ["search", "案件ごとの資料がまとまっている"],
  ["search", "情報が個人PCや頭の中だけにない"],
  ["communication", "変更や追加作業が関係者に伝わる"],
  ["communication", "連絡手段が分散しすぎていない"],
  ["communication", "「聞いてない」が起きにくい"],
  ["standard", "見積・請求のルールがある"],
  ["standard", "単価表・チェックリストがある"],
  ["standard", "担当者による判断のバラつきが少ない"],
  ["connected", "見積内容が作業・請求に引き継がれる"],
  ["connected", "追加作業が請求時に確認できる"],
  ["connected", "同じ情報を何度も入力していない"],
  ["flow", "確認待ちで仕事が止まりにくい"],
  ["flow", "担当者が休んでも業務が止まりにくい"],
  ["flow", "残業の原因が探す・確認・やり直しに偏っていない"],
].map(([axisId, text], index) => ({ id: index + 1, axisId, text }));

const scoreLabels = {
  1: "まったくできていない",
  2: "少しできている",
  3: "半分くらいできている",
  4: "ほぼできている",
  5: "十分できている",
};

const nextStepOptions = [
  "診断結果だけ確認する",
  "詳しい改善ポイントを相談したい",
  "社内で検討してから相談したい",
];

const STORAGE_KEY = "mudanaviSubmissions";

const initialBasicInfo = {
  companyName: "",
  name: "",
  email: "",
  diagnosisCategory: "",
};

function Icon(IconComponent, props = {}) {
  return h(IconComponent, { size: 20, strokeWidth: 2.2, ...props });
}

function toSubmissionRecord({ basicInfo, answers, result, nextStep = "", existingId }) {
  return {
    id: existingId || `mudanavi-${Date.now()}`,
    回答日時: new Date().toISOString(),
    会社名: basicInfo.companyName,
    お名前: basicInfo.name,
    メールアドレス: basicInfo.email,
    電話番号: "",
    業種: "",
    従業員数: "",
    困りごと: "",
    診断カテゴリ: basicInfo.diagnosisCategory,
    基本情報: {
      会社名: basicInfo.companyName,
      お名前: basicInfo.name,
      メールアドレス: basicInfo.email,
      診断カテゴリ: basicInfo.diagnosisCategory,
    },
    "15問の回答": questions.map((question) => ({
      質問番号: question.id,
      質問: question.text,
      診断軸: axes.find((axis) => axis.id === question.axisId)?.label,
      回答: Number(answers[question.id]),
    })),
    "5軸スコア": result.scores.map((axis) => ({
      診断軸: axis.label,
      スコア: axis.score,
    })),
    一番低い軸: result.weakest.label,
    個別相談希望: nextStep,
    次のステップ: nextStep,
  };
}

function saveSubmission(record) {
  const fallback = window.__mudanaviSubmissions || [];
  let previous = fallback;

  try {
    previous = JSON.parse(window.localStorage?.getItem(STORAGE_KEY) || "[]");
  } catch {
    previous = fallback;
  }

  const next = previous.some((item) => item.id === record.id)
    ? previous.map((item) => (item.id === record.id ? record : item))
    : [...previous, record];

  window.__mudanaviSubmissions = next;
  window.__mudanaviLastSubmission = record;

  try {
    window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Some preview browsers restrict localStorage. The in-page fallback still keeps the current session saved.
  }

  return next.length;
}

async function submitToGoogleSheet(record) {
  if (!GOOGLE_SHEETS_WEB_APP_URL) {
    return {
      status: "not_configured",
      message: "Google Sheets送信先が未設定です",
    };
  }

  try {
    await fetch(GOOGLE_SHEETS_WEB_APP_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(record),
    });

    return {
      status: "sent",
      message: "Googleスプレッドシートへ送信しました",
    };
  } catch (error) {
    return {
      status: "failed",
      message: `Googleスプレッドシート送信に失敗しました: ${error.message}`,
    };
  }
}

function App() {
  const [basicInfo, setBasicInfo] = useState(initialBasicInfo);
  const [infoSubmitted, setInfoSubmitted] = useState(false);
  const [answers, setAnswers] = useState(
    Object.fromEntries(questions.map((question) => [question.id, 3]))
  );
  const [showResult, setShowResult] = useState(false);
  const [savedRecord, setSavedRecord] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [sheetStatus, setSheetStatus] = useState({ status: "idle", message: "" });
  const [nextStep, setNextStep] = useState("");

  const result = useMemo(() => {
    const scores = axes.map((axis) => {
      const axisQuestions = questions.filter((question) => question.axisId === axis.id);
      const total = axisQuestions.reduce((sum, question) => sum + Number(answers[question.id]), 0);
      const average = total / axisQuestions.length;

      return {
        ...axis,
        score: Number(average.toFixed(1)),
        fullMark: 5,
      };
    });

    const weakest = [...scores].sort((a, b) => a.score - b.score)[0];
    const totalAverage =
      scores.reduce((sum, axis) => sum + axis.score, 0) / Math.max(scores.length, 1);

    return {
      scores,
      weakest,
      totalAverage: Number(totalAverage.toFixed(1)),
    };
  }, [answers]);

  const answeredCount = Object.keys(answers).length;
  const completion = Math.round((answeredCount / questions.length) * 100);

  const handleAnswer = (questionId, value) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const scrollToDiagnosis = () => {
    document.getElementById(infoSubmitted ? "diagnosis" : "basic-info")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  const reset = () => {
    setBasicInfo(initialBasicInfo);
    setInfoSubmitted(false);
    setAnswers(Object.fromEntries(questions.map((question) => [question.id, 3])));
    setShowResult(false);
    setSavedRecord(null);
    setSavedCount(0);
    setSheetStatus({ status: "idle", message: "" });
    setNextStep("");
    document.getElementById("basic-info")?.scrollIntoView({ behavior: "smooth" });
  };

  const showResults = () => {
    const record = toSubmissionRecord({
      basicInfo,
      answers,
      result,
      nextStep,
      existingId: savedRecord?.id,
    });
    const count = saveSubmission(record);

    setSavedRecord(record);
    setSavedCount(count);
    setShowResult(true);
    setSheetStatus({ status: "idle", message: "" });
    window.setTimeout(() => {
      document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
    }, 60);
  };

  const handleNextStep = async (selectedStep) => {
    const record = toSubmissionRecord({
      basicInfo,
      answers,
      result,
      nextStep: selectedStep,
      existingId: savedRecord?.id,
    });
    const count = saveSubmission(record);

    setNextStep(selectedStep);
    setSavedRecord(record);
    setSavedCount(count);
    setSheetStatus({ status: "sending", message: "Googleスプレッドシートへ送信中です" });

    const nextSheetStatus = await submitToGoogleSheet(record);
    setSheetStatus(nextSheetStatus);
  };

  return h(
    "main",
    null,
    h(Hero, { onStart: scrollToDiagnosis }),
    h(
      "section",
      { className: "section section-muted", "aria-label": "診断軸" },
      h(
        "div",
        { className: "container axis-strip" },
        axes.map((axis) =>
          h(
            "article",
            { className: "axis-chip", key: axis.id },
            h(
              "span",
              { className: "axis-icon", style: { "--axis-color": axis.color } },
              Icon(axis.icon, { size: 21 })
            ),
            h("span", null, axis.label)
          )
        )
      )
    ),
    h(BasicInfoSection, {
      basicInfo,
      setBasicInfo,
          onComplete: () => {
            setInfoSubmitted(true);
            setShowResult(false);
            setSheetStatus({ status: "idle", message: "" });
            setNextStep("");
            window.setTimeout(() => {
              document.getElementById("diagnosis")?.scrollIntoView({ behavior: "smooth" });
            }, 60);
      },
    }),
    infoSubmitted
      ? h(
          "section",
          { className: "section", id: "diagnosis" },
          h(
            "div",
            { className: "container two-column" },
            h(
              "div",
              { className: "intro-panel" },
              h("p", { className: "eyebrow" }, "15問・5段階評価"),
              h("h2", null, "仕事の流れから、見積・請求・残業のムダを見える化"),
              h(
                "p",
                null,
                "「探す」「伝える」「そろえる」「つなぐ」「進める」の5つから、業務の詰まりやすい場所を確認します。"
              ),
              h(
                "div",
                { className: "progress-card" },
                h("div", null, h("span", null, "入力状況"), h("strong", null, `${completion}%`)),
                h("div", { className: "progress-track", "aria-hidden": "true" }, h("span", { style: { width: `${completion}%` } }))
              )
            ),
            h(
              "form",
              { className: "question-list", onSubmit: (event) => event.preventDefault() },
              questions.map((question) =>
                h(QuestionCard, {
                  key: question.id,
                  question,
                  value: Number(answers[question.id]),
                  onAnswer: handleAnswer,
                })
              ),
              h(
                "div",
                { className: "form-actions" },
                h("button", { className: "button button-secondary", type: "button", onClick: reset }, Icon(RotateCcw, { size: 18 }), "リセット"),
                h(
                  "button",
                  { className: "button button-primary", type: "button", onClick: showResults },
                  "診断結果を見る",
                  Icon(ArrowRight, { size: 19 })
                )
              )
            )
          )
        )
      : null,
    showResult
      ? h(ResultSection, {
          result,
          onReset: reset,
          savedRecord,
          savedCount,
          sheetStatus,
          nextStep,
          onNextStep: handleNextStep,
        })
      : null
  );
}

function BasicInfoSection({ basicInfo, setBasicInfo, onComplete }) {
  const update = (field, value) => {
    setBasicInfo((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onComplete();
  };

  return h(
    "section",
    { className: "section", id: "basic-info" },
    h(
      "div",
      { className: "container basic-info-shell" },
      h(
        "div",
        { className: "basic-info-copy" },
        h("p", { className: "eyebrow" }, "診断開始前"),
        h("h2", null, "診断結果の送付先をご入力ください"),
        h("p", null, "診断結果の確認と、必要に応じたご案内のためにご入力ください。")
      ),
      h(
        "form",
        { className: "basic-info-card", onSubmit: handleSubmit },
        h(FormField, {
          label: "会社名",
          value: basicInfo.companyName,
          onChange: (value) => update("companyName", value),
          required: true,
          placeholder: "例：株式会社ムダなび商事",
        }),
        h(FormField, {
          label: "お名前",
          value: basicInfo.name,
          onChange: (value) => update("name", value),
          required: true,
          placeholder: "例：山田 太郎",
        }),
        h(FormField, {
          label: "メールアドレス",
          type: "email",
          value: basicInfo.email,
          onChange: (value) => update("email", value),
          required: true,
          placeholder: "example@company.jp",
        }),
        h(SelectField, {
          label: "診断カテゴリ",
          value: basicInfo.diagnosisCategory,
          onChange: (value) => update("diagnosisCategory", value),
          required: true,
          options: ["見積", "請求", "残業"],
        }),
        h(
          "button",
          { className: "button button-primary basic-submit", type: "submit" },
          "基本情報を保存して診断へ",
          Icon(ArrowRight, { size: 19 })
        )
      )
    )
  );
}

function FormField({ label, value, onChange, type = "text", required = false, placeholder = "" }) {
  return h(
    "label",
    { className: "form-field" },
    h("span", null, label, required ? h("em", null, "必須") : h("small", null, "任意")),
    h("input", {
      type,
      value,
      required,
      placeholder,
      onChange: (event) => onChange(event.target.value),
    })
  );
}

function SelectField({ label, value, onChange, required = false, options }) {
  return h(
    "label",
    { className: "form-field" },
    h("span", null, label, required ? h("em", null, "必須") : h("small", null, "任意")),
    h(
      "select",
      {
        value,
        required,
        onChange: (event) => onChange(event.target.value),
      },
      h("option", { value: "" }, "選択してください"),
      options.map((option) => h("option", { key: option, value: option }, option))
    )
  );
}

function TextareaField({ label, value, onChange, required = false, placeholder = "" }) {
  return h(
    "label",
    { className: "form-field form-field-wide" },
    h("span", null, label, required ? h("em", null, "必須") : h("small", null, "任意")),
    h("textarea", {
      value,
      required,
      rows: 4,
      placeholder,
      onChange: (event) => onChange(event.target.value),
    })
  );
}

function QuestionCard({ question, value, onAnswer }) {
  const axis = axes.find((item) => item.id === question.axisId);

  return h(
    "fieldset",
    { className: "question-card" },
    h("legend", null, h("span", null, `Q${question.id}`), question.text),
    h(
      "div",
      { className: "score-row", role: "radiogroup", "aria-label": question.text },
      [1, 2, 3, 4, 5].map((score) =>
        h(
          "label",
          { className: `score-option ${value === score ? "is-selected" : ""}`, key: score },
          h("input", {
            type: "radio",
            name: `question-${question.id}`,
            value: score,
            checked: value === score,
            onChange: () => onAnswer(question.id, score),
          }),
          h("span", { className: "score-number" }, score),
          h("span", { className: "score-label" }, scoreLabels[score])
        )
      )
    ),
    h(
      "span",
      { className: "question-axis", style: { "--axis-color": axis.color } },
      axis.label
    )
  );
}

function Hero({ onStart }) {
  return h(
    "section",
    { className: "hero" },
    h("div", { className: "hero-leaf hero-leaf-top", "aria-hidden": "true" }),
    h("div", { className: "hero-leaf hero-leaf-bottom", "aria-hidden": "true" }),
    h(
      "div",
      { className: "container hero-inner" },
      h(
        "div",
        { className: "hero-copy" },
        h("div", { className: "brand-pill" }, h("span", { className: "brand-mark", "aria-hidden": "true" }), "ムダなび"),
        h("h1", null, "見積・請求・残業の", h("span", null, "ムダ診断")),
        h(
          "p",
          { className: "hero-lead" },
          "中小企業の仕事の流れを5つの軸で点検し、利益もれや業務の停滞を見える化します。"
        ),
        h(
          "div",
          { className: "hero-actions" },
          h("button", { className: "button button-primary", type: "button", onClick: onStart }, "無料で診断する", Icon(ArrowRight, { size: 19 })),
          h("a", { className: "text-link", href: "#consultation" }, "個別相談へ")
        )
      ),
      h(
        "div",
        { className: "hero-visual", "aria-label": "ムダなびの診断イメージ" },
        h(
          "div",
          { className: "mini-flow" },
          h(FlowCard, { icon: FileText, label: "見積", tone: "green" }),
          h("span", { className: "dot-line" }),
          h(FlowCard, { icon: WalletCards, label: "請求", tone: "blue" }),
          h("span", { className: "dot-line" }),
          h(FlowCard, { icon: Clock3, label: "残業", tone: "orange" })
        ),
        h(
          "div",
          { className: "illustration-card" },
          h("img", { src: "/assets/mudanavi-reference.png", alt: "ムダなびの参考ビジュアル" }),
          h("div", { className: "floating-check" }, Icon(CheckCircle2, { size: 22 }), "流れを整理")
        )
      )
    )
  );
}

function FlowCard({ icon: IconComponent, label, tone }) {
  return h(
    "div",
    { className: `flow-card flow-${tone}` },
    Icon(IconComponent, { size: 36, strokeWidth: 2.1 }),
    h("strong", null, label)
  );
}

function ResultSection({
  result,
  onReset,
  savedRecord,
  savedCount,
  sheetStatus,
  nextStep,
  onNextStep,
}) {
  const { scores, weakest, totalAverage } = result;

  return h(
    "section",
    { className: "section section-result", id: "result" },
    h(
      "div",
      { className: "container result-grid" },
      h(
        "div",
        { className: "result-copy" },
        h("p", { className: "eyebrow" }, "診断結果"),
        h("h2", null, `いちばん整えると効果が出やすい軸は「${weakest.label}」です`),
        h("p", null, weakest.comment),
        savedRecord
          ? h(
              "div",
              { className: "save-status" },
              h("strong", null, "保存しました"),
              h(
                "span",
                null,
                `${savedRecord.会社名} / ${savedRecord.お名前} / 保存件数 ${savedCount}件`
              )
            )
          : null,
        sheetStatus.status !== "idle"
          ? h(
              "div",
              { className: `sheet-status sheet-${sheetStatus.status}` },
              h("strong", null, "Google Sheets"),
              h("span", null, sheetStatus.message)
            )
          : null,
        h("div", { className: "summary-number" }, h("span", null, "総合平均"), h("strong", null, totalAverage), h("small", null, "/ 5.0"))
      ),
      h(
        "div",
        { className: "chart-card" },
        h(
          ResponsiveContainer,
          { width: "100%", height: 360 },
          h(
            RadarChart,
            { data: scores, outerRadius: "72%" },
            h(PolarGrid, { stroke: "#c8d2d7" }),
            h(PolarAngleAxis, { dataKey: "label", tick: { fill: "#09244a", fontSize: 13 } }),
            h(PolarRadiusAxis, { angle: 90, domain: [0, 5], tickCount: 6, tick: { fill: "#6b7785", fontSize: 11 } }),
            h(Radar, {
              name: "点数",
              dataKey: "score",
              stroke: "#d71920",
              fill: "#d71920",
              fillOpacity: 0.22,
              strokeWidth: 3,
            }),
            h(Tooltip, { formatter: (value) => [`${value} / 5`, "点数"] })
          )
        )
      ),
      h(
        "div",
        { className: "score-board" },
        scores.map((axis) =>
          h(
            "article",
            { className: `score-card ${axis.id === weakest.id ? "is-lowest" : ""}`, key: axis.id },
            h(
              "div",
              { className: "score-title" },
              h("span", { style: { "--axis-color": axis.color } }, Icon(axis.icon, { size: 19 })),
              h("strong", null, axis.label)
            ),
            h("div", { className: "score-value" }, h("strong", null, axis.score), h("small", null, "/ 5"))
          )
        )
      ),
      h(NextStepSection, { nextStep, onNextStep }),
      h(Consultation),
      h(
        "div",
        { className: "result-actions" },
        h("button", { className: "button button-secondary", type: "button", onClick: onReset }, Icon(RotateCcw, { size: 18 }), "もう一度診断する")
      )
    )
  );
}

function NextStepSection({ nextStep, onNextStep }) {
  return h(
    "section",
    { className: "next-step-card" },
    h("p", { className: "eyebrow" }, "次のステップ"),
    h("h2", null, "次のステップを選んでください"),
    h(
      "div",
      { className: "next-step-options" },
      nextStepOptions.map((option) =>
        h(
          "button",
          {
            className: `next-step-option ${nextStep === option ? "is-selected" : ""}`,
            key: option,
            type: "button",
            onClick: () => onNextStep(option),
          },
          option
        )
      )
    )
  );
}

function Consultation() {
  return h(
    "section",
    { className: "consultation", id: "consultation" },
    h(
      "div",
      null,
      h("p", { className: "eyebrow" }, "個別相談"),
      h("h2", null, "診断結果をもとに、ムダの原因を一緒に整理します"),
      h(
        "p",
        null,
        "見積・請求・残業のどこで止まりやすいかを確認し、今ある業務フローに合わせた改善ステップを提案します。"
      )
    ),
    h(
      "div",
      { className: "consult-actions" },
      h(
        "a",
        { className: "button button-line", href: LINE_HINT_URL, target: "_blank", rel: "noreferrer" },
        Icon(MessageCircle, { size: 18 }),
        "LINEで改善ヒントを受け取る"
      ),
      h(
        "a",
        { className: "button button-primary", href: CONSULTATION_URL, target: "_blank", rel: "noreferrer" },
        Icon(Send, { size: 18 }),
        "診断結果をもとに個別相談する"
      )
    ),
    h(Sparkles, { className: "consult-sparkle", size: 38, "aria-hidden": "true" })
  );
}

createRoot(document.getElementById("root")).render(h(App));
