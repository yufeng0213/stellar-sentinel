import { createRouter, createWebHashHistory } from 'vue-router'
import TitleView from '../views/TitleView.vue'
import CreateView from '../views/CreateView.vue'
import LlmSettingsView from '../views/LlmSettingsView.vue'
import RunShell from '../views/RunShell.vue'
import StoryView from '../views/StoryView.vue'
import StoryMainView from '../views/StoryMainView.vue'
import DoorView from '../views/DoorView.vue'
import CityView from '../views/CityView.vue'
import CityQuestView from '../views/CityQuestView.vue'
import CityBlackMarketView from '../views/CityBlackMarketView.vue'
import CityMarketView from '../views/CityMarketView.vue'
import CityTavernView from '../views/CityTavernView.vue'
import CityClinicView from '../views/CityClinicView.vue'
import CityGateView from '../views/CityGateView.vue'
import MapView from '../views/MapView.vue'
import InventoryView from '../views/InventoryView.vue'
import ForgeView from '../views/ForgeView.vue'
import CommsView from '../views/CommsView.vue'
import CharacterView from '../views/CharacterView.vue'
import BattleView from '../views/BattleView.vue'
import NpcView from '../views/NpcView.vue'
import NpcLoreView from '../views/NpcLoreView.vue'
import NpcMemoryView from '../views/NpcMemoryView.vue'
import NpcGiftView from '../views/NpcGiftView.vue'
import NpcChatView from '../views/NpcChatView.vue'
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
        { path: 'story', name: 'story', component: StoryView },
        { path: 'story/main', name: 'story-main', component: StoryMainView },
        { path: 'story/door', name: 'story-door', component: DoorView },
        { path: 'city', name: 'city', component: CityView },
        { path: 'city/market', name: 'city-market', component: CityMarketView },
        { path: 'city/tavern', name: 'city-tavern', component: CityTavernView },
        { path: 'city/clinic', name: 'city-clinic', component: CityClinicView },
        { path: 'city/quests', name: 'city-quests', component: CityQuestView },
        { path: 'city/blackmarket', name: 'city-blackmarket', component: CityBlackMarketView },
        { path: 'city/gate', name: 'city-gate', component: CityGateView },
        { path: 'map', name: 'map', component: MapView },
        { path: 'battle/:nodeId', name: 'battle', component: BattleView },
        { path: 'inventory', name: 'inventory', component: InventoryView },
        { path: 'forge', name: 'forge', component: ForgeView },
        {
          path: 'comms',
          name: 'comms',
          redirect: (to) => ({ name: 'comms-section', params: { runId: to.params.runId, section: 'roster' } }),
        },
        { path: 'comms/:section', name: 'comms-section', component: CommsView },
        { path: 'npc/:npcId', name: 'npc', component: NpcView },
        { path: 'npc/:npcId/lore', name: 'npc-lore', component: NpcLoreView },
        { path: 'npc/:npcId/memory', name: 'npc-memory', component: NpcMemoryView },
        { path: 'npc/:npcId/gift', name: 'npc-gift', component: NpcGiftView },
        { path: 'npc/:npcId/chat', name: 'npc-chat', component: NpcChatView },
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
