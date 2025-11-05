
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/login.vue';
import Register from '../components/Register.vue';
import GuestLogin from '../components/GuestLogin.vue';
import GameEngine from '../components/GameEngine.vue';

const routes = [
  { path: '/', redirect: '/game-flow' },
  { path: '/login', component: Login },
  { path: '/guest-login', component: GuestLogin },
  { path: '/register', component: Register },
  { path: '/game-flow', component: GameEngine },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
