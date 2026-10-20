import { createRouter, createWebHashHistory } from 'vue-router'
import TitleView from '../views/TitleView.vue'
import CreateView from '../views/CreateView.vue'
import LlmSettingsView from '../views/LlmSettingsView.vue'
import RunShell from '../views/RunShell.vue'
import MapView from '../views/MapView.vue'
import InventoryView from '../views/InventoryView.vue'
import ForgeView from '../views/ForgeView.vue'
import CommsView from '../views/CommsView.vue'
import CharacterView from '../views/CharacterView.vue'
import BattleView from '../views/BattleView.vue'
import { useGameStore } from '../stores/game.js'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'title', component: TitleView },
    { path: '/create', name: 'create', component: CreateView },
    { path: '/settings/llm', name: 'llm', component: LlmSettingsView },
    {
      path: '/run/:runId',
      component: RunShell,
      children: [
        {
          path: '',
          redirect: (to) => ({ name: 'map', params: { runId: to.params.runId } }),
        },
        { path: 'map', name: 'map', component: MapView },
        { path: 'battle/:nodeId', name: 'battle', component: BattleView },
        { path: 'inventory', name: 'inventory', component: InventoryView },
        { path: 'forge', name: 'forge', component: ForgeView },
        { path: 'comms', name: 'comms', component: CommsView },
        { path: 'character', name: 'character', component: CharacterView },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  const runId = to.params.runId
  if (!runId) return true
  const game = useGameStore()
  if (game.run?.id === runId) return true
  const loaded = game.load(String(runId))
  if (!loaded) return { name: 'title' }
  return true
})

export default router
