
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/login.vue';
import Register from '../components/Register.vue';
import VerifyEmail from '../components/VerifyEmail.vue';
import GameEngine from '../components/GameEngine.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  { path: '/verify-email', component: VerifyEmail },
  { path: '/game', component: GameEngine },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
