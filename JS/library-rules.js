// JS/library-rules.js
// admin/setting.html mein include karein

import {
  getLibrarySettings,
  saveLibrarySettings,
} from "../JS/firebase/settings-services.js";

const finePerDayInput = document.getElementById("finePerDay");
const loanDaysInput = document.getElementById("loanDays");
const dueSoonDaysInput = document.getElementById("dueSoonDays");
const saveRulesBtn = document.getElementById("saveRulesBtn");
const rulesMessage = document.getElementById("rulesMessage");

function showRulesMessage(text, type = "success") {
  if (!rulesMessage) return;

  rulesMessage.innerHTML = `
    <div class="alert alert-${type} py-2 mb-3">
      ${text}
    </div>
  `;

  setTimeout(() => {
    rulesMessage.innerHTML = "";
  }, 4000);
}

async function init() {
  try {
    const s = await getLibrarySettings(true);

    if (finePerDayInput) {
      finePerDayInput.value = s.finePerDay ?? 0;
    }

    if (loanDaysInput) {
      loanDaysInput.value = s.loanDays ?? 14;
    }

    if (dueSoonDaysInput) {
      dueSoonDaysInput.value = s.dueSoonDays ?? 3;
    }
  } catch (err) {
    showRulesMessage("Settings load nahi hui: " + err.message, "danger");
  }
}

saveRulesBtn?.addEventListener("click", async () => {
  const fine = Number(finePerDayInput.value);
  const loanDays = Number(loanDaysInput.value);
  const dueSoonDays = Number(dueSoonDaysInput.value);

  // Fine validation
  if (isNaN(fine) || fine < 0) {
    showRulesMessage("Fine per day sahi number hona chahiye.", "danger");
    return;
  }

  // Loan days validation
  if (isNaN(loanDays) || loanDays < 1) {
    showRulesMessage("Loan days kam az kam 1 hona chahiye.", "danger");
    return;
  }

  // Due soon validation
  if (isNaN(dueSoonDays) || dueSoonDays < 0) {
    showRulesMessage(
      "Due-soon reminder days sahi number hona chahiye.",
      "danger",
    );
    return;
  }

  // Reminder due date se zyada nahi hona chahiye
  if (dueSoonDays >= loanDays) {
    showRulesMessage(
      "Due-soon reminder, loan days se kam hona chahiye.",
      "danger",
    );
    return;
  }

  saveRulesBtn.disabled = true;

  try {
    await saveLibrarySettings({
      finePerDay: fine,
      loanDays: loanDays,
      dueSoonDays: dueSoonDays,
    });

    showRulesMessage("Library rules save ho gaye!", "success");
  } catch (err) {
    console.error("Error saving library rules:", err);

    showRulesMessage("Save nahi hua: " + err.message, "danger");
  } finally {
    saveRulesBtn.disabled = false;
  }
});

init();
