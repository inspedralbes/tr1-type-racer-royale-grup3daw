import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    etapa: 'login',
    nombreJugador: '',
    words: null,
    wordsLoaded: false,
    finalResults: [],
  }),
  actions: {
    setEtapa(etapa) {
      this.etapa = etapa
    },
    setNombreJugador(nombre) {
      this.nombreJugador = nombre
    },
    setWords(words) {
      this.words = words
    },
    setWordsLoaded(loaded) {
      this.wordsLoaded = loaded
    },
    setFinalResults(results) {
      this.finalResults = results
    },
  },
})
