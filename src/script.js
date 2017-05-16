(function() {

  const synonymInput = document.getElementById("synonymInput");
  const rhymeInput = document.getElementById("rhymeInput");
  const submitButton = document.getElementById("submit");
  const matches = {
    perfect: {
      synonym: document.getElementById("perfectSynonymMatches"),
      antonym: document.getElementById("perfectAntonymMatches")
    },
    partial: {
      synonym: document.getElementById("partialSynonymMatches"),
      antonym: document.getElementById("partialAntonymMatches")
    }
  }

  // super unsafe!
  // to make it safe we'd have to build a simple backend
  // to proxy our request to the BigHugeLabs thesaurus API
  // (no credit card is required to use their free tier so harm is limited)
  const BHL_API_KEY = "06a3f8e208a7b89744617022241cbd06";

  function clearMatchesList() {
    for(rhymeType in matches) {
      for(wordType in matches[rhymeType]) {
        while(matches[rhymeType][wordType].hasChildNodes()) {
          matches[rhymeType][wordType].removeChild(
            matches[rhymeType][wordType].lastChild
          );
        }
      }
    }
  }

  function fetchSynonyms(word) {
    return Promise.resolve(
      fetch(`http://words.bighugelabs.com/api/2/${BHL_API_KEY}/${word}/json`)
       .then(response => {
         if(response.ok) {
           return response.json();
         } else if (response.status === 303) { // alternate word, per API documentation
           return fetch(`http://words.bighugelabs.com/api/2/${BHL_API_KEY}/${response.statusText}`)
                   .then(response => response.json());
         } else {
           throw `Could not access thesaurus. Reason: ${response.statusText}`;
         }
       })
       .then(result => {
         let synonymList = [{word, isSynonym: true}]; // words mean the same thing as themselves!
         for(partOfSpeech in result) {
           // ignore part of speech, we want all synonyms
           synonymList = synonymList.concat(result[partOfSpeech].syn
                                      .map(word => { return { word, isSynonym: true}})
                                    )
          if(result[partOfSpeech].usr) {
            synonymList = synonymList.concat(result[partOfSpeech].usr
                                      .map(word => { return { word, isSynonym: true}})
                                    );
          }
          if(result[partOfSpeech].ant) {
            synonymList = synonymList.concat(result[partOfSpeech].ant
                                       .map(word => { return { word, isSynonym: false}})
                                     )
          }
                                    
         }
         console.log(JSON.stringify(synonymList));
         return synonymList;
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
         return results.map(result => { return {word: result.word, isPerfect: result.score === 300} })
                       .concat({word, isPerfect: true}); // words rhyme with themselves!
       })
    )
  }

  function findWordsInCommon(synonymList, rhymeList) {

    console.log(JSON.stringify(synonymList));
    console.log(JSON.stringify(rhymeList));

    // synonyms may be phrases, but rhymes are not
    // extract the last word of each synonym or antonym
    const synonymLastWords = synonymList.map(synonym => /\S+$/.exec(synonym.word)[0]);

    const synonymSet = new Set(synonymLastWords);
    const rhymeSet = new Set(rhymeList.map(rhyme => rhyme.word));
    
    // intersect the sets
    const wordsInCommonSet = new Set();
    for(let word of synonymSet) {
      if(rhymeSet.has(word)) {
        wordsInCommonSet.add(word);
      }
    }

    // go back and make sure we include all
    // the matching synonyms, including phrases
    // and also add perfect/partial rhyme info
    return synonymList.filter(synonym => wordsInCommonSet.has(/\S+$/.exec(synonym.word)[0]))
                      .map(synonym => {
                        return {
                          isPerfect: rhymeList.find(
                            rhyme => rhyme.word === /\S+$/.exec(synonym.word)[0]
                          ).isPerfect,
                          ...synonym
                        }
                      });
  }

  const createListItemWithText = (text) => {
    const li = document.createElement("li");
    li.appendChild(document.createTextNode(text));
    return li;
  }

  function populateMatchesList(words) {
    if(words.length < 1) {
      matches.perfect.synonym.appendChild(
        createListItemWithText("No rhymonyms found, sorry.")
      )
    }
    words.forEach(word => {
      const wordListItem = createListItemWithText(word.word);
      if(word.isPerfect) {
        if(word.isSynonym) {
          matches.perfect.synonym.appendChild(wordListItem);
        } else {
          matches.perfect.antonym.appendChild(wordListItem);
        }
      } else {
        if(word.isSynonym) {
          matches.partial.synonym.appendChild(wordListItem);
        } else {
          matches.partial.antonym.appendChild(wordListItem);
        }
      }
    });
  }


  // validation: must contain exactly one word, no whitespace
  const isValid = (text) => /^\S*$/.test(text);

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
    } else {
      // TODO: feedback to user
    }
  }

  submitButton.addEventListener("click", handleSubmit);

})()