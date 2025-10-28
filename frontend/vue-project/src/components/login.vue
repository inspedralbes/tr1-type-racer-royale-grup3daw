<script setup>
    import { ref } from 'vue';

    const nombre = ref('');
    const nombreConfirmado = ref(false);
    function login (){
        if (nombre.value.trim() !== ''){
            nombreConfirmado.value = true
        }
        else{
            alert("Nombre no seleccionado, por favor ingrese un nombre");
        };
    };
</script>

<template>
    <div class = "login-contenedor" v-if="!nombreConfirmado">
        <h2>Inici de sessió</h2>
        <input v-model = "nom" type = "text" placeholder = "Escriu el teu nom"
        @keyup.enter = "login"/>
        <button @click = "login">Entrar</button>
    </div>

</template>

<style scoped>

</style>