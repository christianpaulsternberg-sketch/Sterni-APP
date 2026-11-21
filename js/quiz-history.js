/* Gemeinsame, serverseitige Fragenreservierung für alle Anglertreff-Duelle. */
window.STERNI_QUIZ_HISTORY = (() => {
  function slug(value) {
    return String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function questionBank() {
    const seen = new Map();
    return (window.STERNI_QUIZ_DATA?.QUESTIONS || []).map((question, index) => {
      const base = slug(question.concept_id || question.question).slice(0, 120) || `frage-${index + 1}`;
      const number = (seen.get(base) || 0) + 1;
      seen.set(base, number);
      const concept_id = question.concept_id || `${base}${number > 1 ? `-${number}` : ''}`;
      return {
        id: question.id || `stern-${String(index + 1).padStart(3, '0')}-${base.slice(0, 90)}`,
        concept_id,
        category: question.category,
        text: question.question,
        options: question.options,
        correct: question.correct + 1
      };
    });
  }

  async function prepareDuel(duelId) {
    const api = window.STERNI_QUIZ_ONLINE;
    if (!api?.rpc) throw Error('Quiz-Verbindung ist nicht bereit.');
    return api.rpc('sterni_quiz_prepare_questions', { duel_id: duelId, question_bank: questionBank() });
  }

  return { questionBank, prepareDuel };
})();
