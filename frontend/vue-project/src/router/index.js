import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/login.vue';
import Register from '../components/Register.vue';
import GuestLogin from '../components/GuestLogin.vue';
import EditProfile from '../components/EditProfile.vue';
import GameEngine from '../components/GameEngine.vue';
import RoomSelection from '../components/RoomSelection.vue';
import RoomSettings from '../components/RoomSettings.vue';
import Lobby from '../components/lobby.vue';
import Joc from '../components/joc.vue'; // The game mode orchestrator
import Final from '../components/paginaFinal.vue';
import PlayerStats from '../components/PlayerStats.vue';

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/guest-login', component: GuestLogin },
  { path: '/register', component: Register },
  { path: '/profile', component: EditProfile },
  { path: '/stats', component: PlayerStats },
  // GameEngine will be the entry point for the game flow, managing etapa state
  { 
    path: '/game', 
    component: GameEngine, // This component will manage the etapa state and navigate
    children: [
      { path: 'select-room', component: RoomSelection },
      { path: 'room-settings', component: RoomSettings },
      { path: 'room-settings/:roomId', component: RoomSettings, props: true },
      { path: 'lobby/:roomId', component: Lobby, props: true },
      { path: 'play/:gameMode/:roomId', component: Joc, props: true },
      { path: 'final', component: Final },
      { path: '', redirect: 'select-room' } // Default child route
    ]
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;