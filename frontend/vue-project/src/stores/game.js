
import { defineStore } from 'pinia';

export const useGameStore = defineStore('game', {
  state: () => ({
    nombreJugador: '',
    etapa: 'room-selection', // login, room-selection, room-settings, lobby, game, done
    words: null,
    wordsLoaded: false,
    finalResults: [],
  }),
  actions: {
    setNombreJugador(nombre) {
      this.nombreJugador = nombre;
    },
    setEtapa(etapa) {
      console.log('GameEngine etapa changed to:', etapa);
      this.etapa = etapa;
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
      this.etapa = 'room-selection';
      this.words = null;
      this.wordsLoaded = false;
      this.finalResults = [];
    },
  },
});

