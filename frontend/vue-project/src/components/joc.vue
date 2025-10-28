<script setup>
    import { ref, computed } from 'vue';

    const estatDelJoc = ref({
        paraules: [
            { id: 1, text: 'component', estat: 'pendent', errors: 0},
            { id: 2, text: 'reactivitat', estat: 'pendent', errors: 0},
            { id: 3, text: 'javascript', estat: 'pendent', errors: 0},
            { id: 4, text: 'framework', estat: 'pendent', errors: 0},
            { id: 5, text: 'template', estat: 'pendent', errors: 0},
        ],
        indexParaulaActiva: 0,
        textEntrat: '',
        stats: [],
        errorTotal: 0,
    });
    const paraulaActiva = computed(() => {
        return estatDelJoc.value.paraules[estatDelJoc.value.indexParaulaActiva];
    });

    let temps = 0;

    function cronometro(){
        temps = Date.now;
    };

    function obtenirClasseLletra(lletra, index) {
        const entrada = estatDelJoc.value.textEntrat[index];
        if (!entrada) return '';
        return lletra === entrada ? 'lletra-correcta' : 'lletra-incorrecta';
        };

    function validarProgres() {
        const entrada = estatDelJoc.value.textEntrat.toLowerCase();
        estatDelJoc.value.textEntrat = entrada;

        if (entrada.length === 1 && temps === 0){
            cronometro;
        };

        const paraula = paraulaActiva.value;

        for (let i = 0; i < entrada.length; i++){
            paraula._errors = paraula._errors || [];

            if(entrada[i] !== paraula.text[i] && !paraula._errors[i]){
                paraula.errors++;
                estatDelJoc.value.errorTotal++;
                paraula._errors[i] = true;
            };
        };
        if (entrada === paraula.text){
            estatDelJoc.value.stats.push({
                paraula: paraula.text,
                errors: paraula.errors
            });
            paraula.estat = 'completada';
            estatDelJoc.value.indexParaulaActiva++;
            estatDelJoc.value.textEntrat = '';
        };
    };
</script>

<template>

</template>

<style scoped>

</style>