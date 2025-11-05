
import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/login.vue';
import Register from '../components/Register.vue';
import GuestLogin from '../components/GuestLogin.vue';
import Joc from '../components/joc.vue';
import Lobby from '../components/lobby.vue';
import PaginaFinal from '../components/paginaFinal.vue';
import RoomSelection from '../components/RoomSelection.vue';
import RoomSettings from '../components/RoomSettings.vue';

const routes = [
  { path: '/', redirect: '/rooms' },
  { path: '/login', component: Login },
  { path: '/guest-login', component: GuestLogin },
  { path: '/register', component: Register },
  { path: '/joc', component: Joc },
  { path: '/lobby', component: Lobby },
  { path: '/final', component: PaginaFinal },
  { path: '/rooms', component: RoomSelection },
  { path: '/room-settings', component: RoomSettings },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
