import { createRouter, createWebHistory } from 'vue-router'
import PublicBoard from '../views/PublicBoard.vue'
import TechnicianPortal from '../views/TechnicianPortal.vue'

const routes = [
  {
    path: '/',
    name: 'PublicBoard',
    component: PublicBoard
  },
  {
    path: '/teknisi',
    name: 'TechnicianPortal',
    component: TechnicianPortal
  },
  {
    // Catch-all: redirect any unknown URL to public home
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
