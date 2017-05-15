(function() {

  const synonymInput = document.getElementById("synonymInput");
  const rhymeInput = document.getElementById("rhymeInput");
  const submitButton = document.getElementById("submit");
  const matchesList = document.getElementById("matches");

  const BHL_API_KEY = "06a3f8e208a7b89744617022241cbd06";

  // validation: must contain exactly one word, no whitespace
  const isValid = (text) => /^\S*$/.test(text);

  function clearMatchesList() {
    while(matchesList.hasChildNodes()) {
      matchesList.removeChild(matchesList.lastChild);
    }
  }

  function fetchSynonyms(word) {
    return Promise.resolve(
      fetch(`http://words.bighugelabs.com/api/2/${BHL_API_KEY}/${word}/json`)
       .then(response => {
         if(response.ok) {
           return response.json();
         } else if (response.status === 303) { // alternate word
           return fetch(`http://words.bighugelabs.com/api/2/${BHL_API_KEY}/${response.statusText}`)
                   .then(response => response.json());
         } else {
           throw `Could not access thesaurus. Reason: ${response.statusText}`;
         }
       })
       .then(result => {
         console.log(JSON.stringify(result));
         let wordList = [];
         for(partOfSpeech in result) {
           // ignore part of speech, we want all synonyms
           wordList = wordList.concat(result[partOfSpeech].syn);
         }
         return wordList;
       })
    )
  }

  function fetchRhymes(word) {
    return Promise.resolve(
      fetch(`http://rhymebrain.com/talk?function=getRhymes&word=${word}`)
       .then(response => {
         if(response.ok) {
           return response.json();
         } else {
           throw `Could not access rhyming dictionary. Reason: ${response.statusText}`;
         }
       })
       .then(results => {
         console.log(JSON.stringify(results));
         return results.map(result => result.word);
       })
    )
  }

  function findWordsInCommon(synonyms, rhymes) {
    // synonyms may be phrases, but rhymes are not
    // extract the last word of each synonym
    const synonymLastWords = synonyms.map(phrase => /\S+$/.exec(phrase)[0]);

    const synonymSet = new Set(synonymLastWords);
    const rhymeSet = new Set(rhymes);
    
    // intersect the sets
    const wordsInCommonSet = new Set();
    for(let word of synonymSet) {
      if(rhymeSet.has(word)) {
        wordsInCommonSet.add(word);
      }
    }

    // go back and make sure we include all
    // the matching synonyms, including phrases
    return synonyms.filter(phrase => wordsInCommonSet.has(/\S+$/.exec(phrase)[0]));
  }

  const createListItemWithText = (text) => {
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(text));
    return li;
  }

  function populateMatchesList(words) {
    if(words.length < 1) {
      matchesList.appendChild(
        createListItemWithText("No matches found.")
      )
    }
    words.forEach(word => {
      matchesList.appendChild(
        createListItemWithText(word)
      );
    });
  }

  function handleSubmit(evt) {
    clearMatchesList();
    // TODO: loading spinner or something
    const synonymText = synonymInput.value.trim();
    const rhymeText = rhymeInput.value.trim();
    if(isValid(synonymText) && isValid(rhymeText)) {
       Promise.all([fetchSynonyms(synonymText), fetchRhymes(rhymeText)])
              .then(([synonyms, rhymes]) => findWordsInCommon(synonyms, rhymes))
              .then(wordsInCommon => populateMatchesList(wordsInCommon))
              .catch(reason => alert(reason));
              // TODO: handle failure gracefully
    }
  }

  submitButton.addEventListener("click", handleSubmit);

})()