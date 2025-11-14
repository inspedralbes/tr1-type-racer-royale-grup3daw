
import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
  state: () => ({
    nombreJugador: '',
    words: null,
    wordsLoaded: false,
    finalResults: [],
  }),
  actions: {
    setNombreJugador(nombre) {
      this.nombreJugador = nombre;
    },
    setWords(newWords) {
      this.words = newWords;
    },
    setWordsLoaded(loaded) {
      this.wordsLoaded = loaded;
    },
    setFinalResults(results) {
      this.finalResults = results;
    },
    resetState() {
      this.nombreJugador = '';
      this.words = null;
      this.wordsLoaded = false;
      this.finalResults = [];
    },
  },
});

