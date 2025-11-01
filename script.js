const DATA_URL = "./data/shabda_master_full_corrected.csv";
const VACANA_KEYS = ["Eka", "Dvi", "Bahu"];
const VACANA_LABELS = {
  Eka: "एकवचनम् (Singular)",
  Dvi: "द्विवचनम् (Dual)",
  Bahu: "बहुवचनम् (Plural)",
};

const state = {
  mode: "properties-to-form",
  entries: [],
  unique: {
    Shabda: [],
    Linga: [],
    Anta: [],
    Vibhakti: [],
  },
  currentQuestion: null,
  totalQuestions: 0,
  correctAnswers: 0,
  isBusy: false,
};

const gameSurface = document.getElementById("game-surface");
const modePropertiesBtn = document.getElementById("mode-properties");
const modeFormsBtn = document.getElementById("mode-forms");
const correctCountEl = document.getElementById("correct-count");
const totalCountEl = document.getElementById("total-count");
const progressBarEl = document.getElementById("progress-bar");
const progressPercentEl = document.getElementById("progress-percent");
const confettiLayer = document.getElementById("confetti-layer");
const loadingCard = document.getElementById("loading-card");

document.addEventListener("DOMContentLoaded", init);

function init() {
  attachModeHandlers();
  loadDataset()
    .then((entries) => {
      state.entries = entries;
      computeUniqueSets();
      hideLoading();
      renderNextQuestion();
    })
    .catch((error) => {
      console.error(error);
      hideLoading();
      showDatasetFallback(error);
    });
}

function attachModeHandlers() {
  modePropertiesBtn.addEventListener("click", () => switchMode("properties-to-form"));
  modeFormsBtn.addEventListener("click", () => switchMode("form-to-properties"));
}

async function loadDataset() {
  
  if (window.location.protocol === "file:") {
    throw new Error("file-protocol");
  }
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to load dataset: ${response.status}`);
  }
  const rawText = await response.text();
  const entries = parseCSV(rawText).filter((entry) => {
    return Boolean(entry.Shabda && entry.Vibhakti && hasAnyVacana(entry));
  });
  if (!entries.length) {
    throw new Error("Dataset appears empty after parsing");
  }
  return entries;
}

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (!lines.length) {
    return rows;
  }
  let headerLine = lines[0];
  if (headerLine.charCodeAt(0) === 0xfeff) {
    headerLine = headerLine.slice(1);
  }
  const headers = splitCSVLine(headerLine).map((token) => token.trim());
  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCSVLine(lines[i]);
    if (!values.length) {
      continue;
    }
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = (values[index] ?? "").trim();
    });
    rows.push(entry);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result;
}

function hasAnyVacana(entry) {
  return VACANA_KEYS.some((key) => Boolean(entry[key] && entry[key].trim().length));
}

function computeUniqueSets() {
  const unique = {
    Shabda: new Set(),
    Linga: new Set(),
    Anta: new Set(),
    Vibhakti: new Set(),
  };
  state.entries.forEach((entry) => {
    if (entry.Shabda) unique.Shabda.add(entry.Shabda);
    if (entry.Linga) unique.Linga.add(entry.Linga);
    if (entry.Anta) unique.Anta.add(entry.Anta);
    if (entry.Vibhakti) unique.Vibhakti.add(entry.Vibhakti);
  });
  state.unique = {
    Shabda: [...unique.Shabda],
    Linga: [...unique.Linga],
    Anta: [...unique.Anta],
    Vibhakti: [...unique.Vibhakti],
  };
}

function hideLoading() {
  if (loadingCard) {
    loadingCard.remove();
  }
}

function showDatasetFallback(error) {
  if (error.message === "file-protocol") {
    showUploadCard(
      "लोकल-सञ्चिकायाः कारणात् दत्तांश-लोडिङ् न शक्यते। (Data cannot load directly from a local file.) कृपया CSV फाइल् अधः अपलोड् कृत्वा अभ्यासं आरभध्वम् अथवा स्थानिकी सर्वर् (उदा. npx serve) द्वारा पृष्ठम् उद्घाट्य प्रयुञ्जीत।",
    );
    return;
  }
  showUploadCard(
    "दत्तांशः लोड् न जातः। (The data failed to load.) पुनः प्रयत्नं कुर्वन्तु वा, अधो दत्तं CSV अपलोड् कृत्वा अभ्यासं आरभध्वम्।",
  );
}

function showUploadCard(message) {
  const card = createCardShell("दत्तांश-अपलोड् आवश्यकः | Upload the dataset");
  const info = document.createElement("p");
  info.textContent = message;
  info.style.marginBottom = "1rem";
  const uploadGroup = document.createElement("div");
  uploadGroup.className = "input-group";
  const uploadLabel = document.createElement("label");
  uploadLabel.setAttribute("for", "dataset-upload");
  uploadLabel.textContent = "CSV सञ्चिका चिनुत | Select the CSV file:";
  const uploadInput = document.createElement("input");
  uploadInput.type = "file";
  uploadInput.id = "dataset-upload";
  uploadInput.accept = ".csv,text/csv";
  uploadGroup.append(uploadLabel, uploadInput);
  const helper = document.createElement("p");
  helper.textContent = "अपलोड् कृते पश्चात् स्वयमेव अभ्यासः आरभ्यते। (The practice will start automatically after upload.)";
  helper.style.fontSize = "0.95rem";
  helper.style.color = "rgba(44, 26, 20, 0.75)";

  uploadInput.addEventListener("change", (event) => {
    const [file] = event.target.files;
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const entries = parseCSV(reader.result).filter((entry) => Boolean(entry.Shabda && entry.Vibhakti && hasAnyVacana(entry)));
        if (!entries.length) {
          throw new Error("empty");
        }
        state.entries = entries;
        computeUniqueSets();
        renderNextQuestion();
        updateScoreboard();
      } catch (parseError) {
        console.error(parseError);
        showErrorCard("दोषः जातः | Error", "सञ्चिकायाः विवरणं पठितुं न शक्यते। (Unable to read the file.) कृपया सुनिश्चितं कुर्वन्तु यत् शीर्षिकाः सम्यग् सन्ति। (Check that headers are correct.)");
      }
    };
    reader.onerror = () => {
      console.error(reader.error);
      showErrorCard("दोषः जातः | Error", "सञ्चिका पठने समस्या। (File read issue.) पुनः प्रयत्नं कुर्वन्तु। (Please try again.)");
    };
    reader.readAsText(file, "utf-8");
  });

  card.append(info, uploadGroup, helper);
  setContent(card);
}

function switchMode(mode) {
  if (state.mode === mode || state.isBusy) {
    return;
  }
  state.mode = mode;
  modePropertiesBtn.classList.toggle("active", mode === "properties-to-form");
  modePropertiesBtn.setAttribute("aria-selected", mode === "properties-to-form" ? "true" : "false");
  modeFormsBtn.classList.toggle("active", mode === "form-to-properties");
  modeFormsBtn.setAttribute("aria-selected", mode === "form-to-properties" ? "true" : "false");
  renderNextQuestion();
}

function renderNextQuestion() {
  if (!state.entries.length) {
    return;
  }
  if (state.mode === "properties-to-form") {
    state.currentQuestion = buildPropertiesToFormQuestion();
    renderPropertiesToFormCard(state.currentQuestion);
  } else {
    state.currentQuestion = buildFormToPropertiesQuestion();
    renderFormToPropertiesCard(state.currentQuestion);
  }
}

function buildPropertiesToFormQuestion() {
  let entry = selectRandomEntry();
  let vacanaKey = randomVacanaKey(entry);
  let guard = 0;
  while (!vacanaKey && guard < 20) {
    entry = selectRandomEntry();
    vacanaKey = randomVacanaKey(entry);
    guard += 1;
  }
  if (!vacanaKey) {
    throw new Error("Unable to find valid vacana for question");
  }
  const variants = extractVariants(entry[vacanaKey]);
  if (!variants.normalised.length) {
    throw new Error("No valid forms for selected entry");
  }
  return {
    type: "properties-to-form",
    entry,
    vacanaKey,
    variants,
  };
}

function buildFormToPropertiesQuestion() {
  let entry = selectRandomEntry();
  let vacanaKey = randomVacanaKey(entry);
  let guard = 0;
  while (!vacanaKey && guard < 20) {
    entry = selectRandomEntry();
    vacanaKey = randomVacanaKey(entry);
    guard += 1;
  }
  if (!vacanaKey) {
    throw new Error("Unable to find valid vacana for question");
  }
  const variants = extractVariants(entry[vacanaKey]);
  if (!variants.normalised.length) {
    throw new Error("No valid forms for selected entry");
  }
  const combos = getAcceptableCombos(entry, vacanaKey, variants);
  const primaryCombo = combos.find(
    (combo) => combo.Vibhakti === entry.Vibhakti && combo.Vacana === vacanaKey,
  ) || combos[0];
  const shabdaChoices = uniqueValuesFromCombos(combos, "Shabda");
  const lingaChoices = uniqueValuesFromCombos(combos, "Linga");
  const antaChoices = uniqueValuesFromCombos(combos, "Anta");
  const vibhaktiChoices = uniqueValuesFromCombos(combos, "Vibhakti");
  const options = {
    Shabda: buildOptionsPool(state.unique.Shabda, shabdaChoices, 4),
    Linga: buildOptionsPool(state.unique.Linga, lingaChoices, 4),
    Anta: buildOptionsPool(state.unique.Anta, antaChoices, 4),
    Vibhakti: buildOptionsPool(
      state.unique.Vibhakti,
      vibhaktiChoices,
      Math.min(6, state.unique.Vibhakti.length),
    ),
    Vacana: VACANA_KEYS,
  };
  return {
    type: "form-to-properties",
    entry,
    vacanaKey,
    variants,
    combos,
    options,
    primaryCombo,
  };
}

function selectRandomEntry() {
  const index = Math.floor(Math.random() * state.entries.length);
  return state.entries[index];
}

function randomVacanaKey(entry) {
  const available = VACANA_KEYS.filter((key) => Boolean(entry[key] && entry[key].trim().length));
  if (!available.length) {
    return null;
  }
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

function buildOptionsPool(allValues, correctValues, desiredSize) {
  const correctArray = Array.isArray(correctValues)
    ? correctValues.filter(Boolean)
    : [correctValues].filter(Boolean);
  const targetSize = Math.max(
    typeof desiredSize === "number" ? desiredSize : correctArray.length,
    correctArray.length || 1,
  );
  if (!correctArray.length && !allValues.length) {
    return [];
  }
  if (!correctArray.length) {
    return shuffleArray([...allValues]);
  }
  const pool = new Set(correctArray);
  const shuffled = shuffleArray([...allValues]);
  for (const value of shuffled) {
    if (!value) {
      continue;
    }
    if (pool.size >= targetSize) {
      break;
    }
    if (pool.has(value)) {
      continue;
    }
    pool.add(value);
  }
  return shuffleArray([...pool]);
}

function shuffleArray(values) {
  const array = [...values];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderPropertiesToFormCard(question) {
  const { entry, vacanaKey, variants } = question;
  const card = createCardShell("गुणात् रूपम् | Form from properties");
  const promptBlock = createPromptBlock([
    ["शब्दः (Base word)", entry.Shabda],
    ["लिङ्गम् (Gender)", entry.Linga],
    ["अन्तः (Stem ending)", entry.Anta],
    ["विभक्तिः (Case)", entry.Vibhakti],
    ["वचनम् (Number)", VACANA_LABELS[vacanaKey]],
  ]);

  const responseArea = document.createElement("div");
  responseArea.className = "response-area";

  const form = document.createElement("form");
  form.setAttribute("autocomplete", "off");

  const inputGroup = document.createElement("div");
  inputGroup.className = "input-group";
  const inputLabel = document.createElement("label");
  inputLabel.setAttribute("for", "form-answer");
  inputLabel.textContent = "रूपम् लिखत (Type the form):";
  const input = document.createElement("input");
  input.id = "form-answer";
  input.name = "answer";
  input.type = "text";
  input.placeholder = "उदाहरणम्: रामः (Example)";
  input.setAttribute("inputmode", "text");
  input.required = true;
  inputGroup.append(inputLabel, input);

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "button-group";
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "primary-button";
  submitBtn.textContent = "समर्पयतु | Submit";
  buttonGroup.append(submitBtn);

  form.append(inputGroup, buttonGroup);
  responseArea.append(form);

  const resultHolder = document.createElement("div");
  responseArea.append(resultHolder);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isBusy) {
      return;
    }
    const userInput = form.answer.value.trim();
    evaluatePropertiesToFormAnswer(question, userInput, variants, resultHolder, form, submitBtn);
  });

  card.append(promptBlock, responseArea);
  setContent(card);
  input.focus();
}

function evaluatePropertiesToFormAnswer(question, userInput, variants, resultHolder, form, submitBtn) {
  state.isBusy = true;
  const normalisedUser = normaliseForm(userInput);
  const isCorrect = normalisedUser.length > 0 && variants.normalised.includes(normalisedUser);
  if (isCorrect) {
    state.correctAnswers += 1;
    fireConfetti();
  }
  state.totalQuestions += 1;
  updateScoreboard();

  submitBtn.disabled = true;
  form.answer.disabled = true;

  const displayAnswer = variants.display.join(" / ");
  const banner = buildResultBanner(isCorrect, [
    `भवतः उत्तरम्: ${normalisedUser || "—"} (Your answer)`,
    `सम्मत-उत्तरम्: ${displayAnswer} (Accepted form/s)`,
  ]);
  resultHolder.innerHTML = "";
  resultHolder.append(banner, buildNextButton());
  state.isBusy = false;
}

function renderFormToPropertiesCard(question) {
  const { variants, options } = question;
  const displayForm = variants.display.join(" / ");
  const card = createCardShell("रूपात् गुणाः | Properties from form");
  const promptBlock = createPromptBlock([
    ["दत्तं रूपम् (Given form)", displayForm],
  ]);

  const responseArea = document.createElement("div");
  responseArea.className = "response-area";
  const formElement = document.createElement("form");
  formElement.setAttribute("autocomplete", "off");
  formElement.className = "property-form";

  const selectGroups = [
    { name: "Shabda", label: "शब्दः चिनोत (Choose the base word)", options: options.Shabda },
    { name: "Linga", label: "लिङ्गम् चिनोत (Choose the gender)", options: options.Linga },
    { name: "Anta", label: "अन्तः चिनोत (Choose the stem ending)", options: options.Anta },
  ];

  selectGroups.forEach(({ name, label, options: opts }) => {
    const group = document.createElement("div");
    group.className = "input-group";

    const selectLabel = document.createElement("label");
    selectLabel.setAttribute("for", `select-${name}`);
    selectLabel.textContent = label;

    const select = document.createElement("select");
    select.id = `select-${name}`;
    select.name = name;
    select.required = true;

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "— चिनोत / Select —";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    opts.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });

    group.append(selectLabel, select);
    formElement.appendChild(group);
  });

  const vibhaktiGroup = document.createElement("div");
  vibhaktiGroup.className = "input-group";
  const vibhaktiLabel = document.createElement("span");
  vibhaktiLabel.className = "prompt-label";
  vibhaktiLabel.textContent = "विभक्तयः चिनोत (समस्ताः) • Select all applicable cases:";
  const vibhaktiOptions = document.createElement("div");
  vibhaktiOptions.className = "options-grid options-grid--two";

  options.Vibhakti.forEach((value) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "Vibhakti";
    checkbox.value = value;
    const span = document.createElement("span");
    span.textContent = value;
    label.append(checkbox, span);
    vibhaktiOptions.appendChild(label);
  });

  const vibhaktiError = document.createElement("div");
  vibhaktiError.className = "field-error";
  vibhaktiError.textContent = "कृपया दत्तस्य रूपस्य सर्वाः सम्भवन्त्यः विभक्तयः चिनोतु। (Select every matching case.)";

  vibhaktiGroup.append(vibhaktiLabel, vibhaktiOptions, vibhaktiError);
  formElement.appendChild(vibhaktiGroup);
  vibhaktiOptions.addEventListener("change", () => {
    if (formElement.querySelector('input[name="Vibhakti"]:checked')) {
      vibhaktiError.classList.remove("visible");
    }
  });

  const vacanaGroup = document.createElement("div");
  vacanaGroup.className = "input-group";
  const vacanaLabel = document.createElement("span");
  vacanaLabel.className = "prompt-label";
  vacanaLabel.textContent = "वचनम् चिनोत (Pick the number):";
  const vacanaOptions = document.createElement("div");
  vacanaOptions.className = "options-grid options-grid--three";

  VACANA_KEYS.forEach((key) => {
    const label = document.createElement("label");
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "Vacana";
    radio.value = key;
    radio.required = true;
    const span = document.createElement("span");
    span.textContent = VACANA_LABELS[key];
    label.append(radio, span);
    vacanaOptions.appendChild(label);
  });

  vacanaGroup.append(vacanaLabel, vacanaOptions);
  formElement.appendChild(vacanaGroup);

  const buttonGroup = document.createElement("div");
  buttonGroup.className = "button-group";
  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "primary-button";
  submitBtn.textContent = "समर्पयतु | Submit";
  buttonGroup.append(submitBtn);
  formElement.appendChild(buttonGroup);

  const resultHolder = document.createElement("div");
  responseArea.append(formElement, resultHolder);

  formElement.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.isBusy) {
      return;
    }
    const formData = new FormData(formElement);
    const userAnswer = {
      Shabda: formData.get("Shabda"),
      Linga: formData.get("Linga"),
      Anta: formData.get("Anta"),
      Vacana: formData.get("Vacana"),
      Vibhakti: Array.from(formElement.querySelectorAll('input[name="Vibhakti"]:checked')).map(
        (input) => input.value,
      ),
    };
    if (!userAnswer.Vibhakti.length) {
      vibhaktiError.classList.add("visible");
      return;
    }
    vibhaktiError.classList.remove("visible");
    evaluateFormToPropertiesAnswer(question, userAnswer, resultHolder, formElement, submitBtn);
  });

  card.append(promptBlock, responseArea);
  setContent(card);
}

function evaluateFormToPropertiesAnswer(question, userAnswer, resultHolder, formElement, submitBtn) {
  state.isBusy = true;
  const primary = question.primaryCombo;
  const requiredVibhaktis = uniqueValuesFromCombos(question.combos, "Vibhakti").sort();
  const userVibhaktis = [...new Set(userAnswer.Vibhakti)].sort();
  const vibhaktiMatch = requiredVibhaktis.length === userVibhaktis.length
    && requiredVibhaktis.every((value, index) => value === userVibhaktis[index]);
  const shabdaMatch = userAnswer.Shabda === primary.Shabda;
  const lingaMatch = userAnswer.Linga === primary.Linga;
  const antaMatch = userAnswer.Anta === primary.Anta;
  const vacanaMatch = userAnswer.Vacana === primary.Vacana;
  const isCorrect = vibhaktiMatch && shabdaMatch && lingaMatch && antaMatch && vacanaMatch;
  if (isCorrect) {
    state.correctAnswers += 1;
    fireConfetti();
  }
  state.totalQuestions += 1;
  updateScoreboard();

  Array.from(formElement.elements).forEach((el) => {
    el.disabled = true;
  });
  submitBtn.disabled = true;

  const vacanaLabel = VACANA_LABELS[primary.Vacana];
  const userVibhaktiDisplay = userVibhaktis.length ? userVibhaktis.join(" / ") : "—";
  const correctVibhaktiDisplay = requiredVibhaktis.join(" / ");
  const correctLines = [
    `शब्दः — ${primary.Shabda} (Base word)`,
    `लिङ्गम् — ${primary.Linga} (Gender)`,
    `अन्तः — ${primary.Anta} (Stem ending)`,
    `भवतः विभक्तयः — ${userVibhaktiDisplay} (Your selected cases)`,
    `सम्मत विभक्तयः — ${correctVibhaktiDisplay} (All valid cases)`,
    `वचनम् — ${vacanaLabel}`,
  ];

  const banner = buildResultBanner(isCorrect, correctLines);
  resultHolder.innerHTML = "";
  resultHolder.append(banner, buildNextButton());
  state.isBusy = false;
}

function createCardShell(titleText) {
  const card = document.createElement("article");
  card.className = "card";
  const heading = document.createElement("h2");
  heading.textContent = titleText;
  card.appendChild(heading);
  return card;
}

function createPromptBlock(pairs) {
  const container = document.createElement("div");
  container.className = "prompt";
  pairs.forEach(([label, value]) => {
    const line = document.createElement("div");
    line.className = "prompt-line";
    const labelSpan = document.createElement("span");
    labelSpan.className = "prompt-label";
    labelSpan.textContent = `${label}:`;
    const valueSpan = document.createElement("span");
    valueSpan.textContent = value;
    line.append(labelSpan, valueSpan);
    container.appendChild(line);
  });
  return container;
}

function setContent(node) {
  gameSurface.innerHTML = "";
  gameSurface.appendChild(node);
}

function buildResultBanner(isCorrect, lines) {
  const banner = document.createElement("div");
  banner.className = `result-banner ${isCorrect ? "success" : "error"}`;
  const status = document.createElement("strong");
  status.textContent = isCorrect
    ? "साधु! सम्यक् उत्तरम्। (Excellent, that is correct.)"
    : "दोषः। पुनः अभ्यासः आवश्यकः। (Not quite—keep practicing.)";
  banner.appendChild(status);
  lines.forEach((line) => {
    const p = document.createElement("div");
    p.className = "correct-answer";
    p.textContent = line;
    banner.appendChild(p);
  });
  return banner;
}

function buildNextButton() {
  const container = document.createElement("div");
  container.className = "button-group";
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "secondary-button";
  nextBtn.textContent = "अन्यः प्रश्नः | Next question";
  nextBtn.addEventListener("click", () => {
    renderNextQuestion();
  });
  container.appendChild(nextBtn);
  return container;
}

function updateScoreboard() {
  correctCountEl.textContent = toDevanagariNumber(state.correctAnswers);
  totalCountEl.textContent = toDevanagariNumber(state.totalQuestions);
  const percent = state.totalQuestions === 0
    ? 0
    : Math.round((state.correctAnswers / state.totalQuestions) * 100);
  progressBarEl.style.width = `${percent}%`;
  progressPercentEl.textContent = `${toDevanagariNumber(percent)}%`;
}

function toDevanagariNumber(value) {
  return value.toString().replace(/\d/g, (digit) => String.fromCharCode(0x0966 + Number(digit)));
}

function normaliseForm(value) {
  return (value || "")
    .normalize("NFC")
    .replace(/\s+/g, "")
    .trim();
}

function fireConfetti() {
  const colors = ["#ff9933", "#f4dfba", "#e65c7b", "#ffd54f", "#8d2b2b"];
  const pieceCount = 90;
  for (let i = 0; i < pieceCount; i += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.backgroundColor = colors[i % colors.length];
    piece.style.left = `${Math.random() * 100}%`;
    const xStart = `${(Math.random() * 20 - 10).toFixed(2)}vw`;
    const xEnd = `${(Math.random() * 40 - 20).toFixed(2)}vw`;
    const rotation = `${Math.random() * 360}deg`;
    piece.style.setProperty("--x-start", xStart);
    piece.style.setProperty("--x-end", xEnd);
    piece.style.setProperty("--rotation", rotation);
    piece.style.animationDelay = `${Math.random() * 0.2}s`;
    confettiLayer.appendChild(piece);
    setTimeout(() => {
      piece.remove();
    }, 1600);
  }
}

function showErrorCard(title, message) {
  const card = createCardShell(title);
  const paragraph = document.createElement("p");
  paragraph.textContent = message;
  card.appendChild(paragraph);
  setContent(card);
}

function extractVariants(raw) {
  if (!raw) {
    return { display: [], normalised: [] };
  }
  const parts = raw
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  const display = parts.length ? parts : [raw.trim()];
  const normalised = display
    .map((segment) => normaliseForm(segment))
    .filter((segment) => segment.length > 0);
  return {
    display,
    normalised: normalised.length ? normalised : [normaliseForm(raw)],
  };
}

function getAcceptableCombos(entry, vacanaKey, referenceVariants) {
  const combos = [];
  state.entries.forEach((candidate) => {
    if (candidate.Shabda !== entry.Shabda) {
      return;
    }
    if (candidate.Linga !== entry.Linga || candidate.Anta !== entry.Anta) {
      return;
    }
    const candidateVariants = extractVariants(candidate[vacanaKey]);
    const sharesForm = candidateVariants.normalised.some(
      (form) => referenceVariants.normalised.includes(form),
    );
    if (!sharesForm) {
      return;
    }
    const id = [
      candidate.Shabda,
      candidate.Linga,
      candidate.Anta,
      candidate.Vibhakti,
      vacanaKey,
    ].join("::");
    combos.push({
      id,
      Shabda: candidate.Shabda,
      Linga: candidate.Linga,
      Anta: candidate.Anta,
      Vibhakti: candidate.Vibhakti,
      Vacana: vacanaKey,
    });
  });
  if (!combos.length) {
    combos.push({
      id: `fallback::${entry.Shabda}::${entry.Linga}::${entry.Anta}::${entry.Vibhakti}::${vacanaKey}`,
      Shabda: entry.Shabda,
      Linga: entry.Linga,
      Anta: entry.Anta,
      Vibhakti: entry.Vibhakti,
      Vacana: vacanaKey,
    });
  }
  const deduped = [];
  const seen = new Set();
  combos.forEach((combo) => {
    if (seen.has(combo.id)) {
      return;
    }
    seen.add(combo.id);
    deduped.push(combo);
  });
  return deduped;
}

function uniqueValuesFromCombos(combos, key) {
  return [...new Set(combos.map((combo) => combo[key]).filter(Boolean))];
}
