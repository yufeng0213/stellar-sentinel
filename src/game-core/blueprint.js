/**
 * 图纸解锁：初始只掌握基础图纸，Boss 与精英会掉落更深的图纸。
 */

import { BOSS_BLUEPRINT, RECIPES } from './data.js'

const TIERS = {
  standard: '标准图纸',
  fine: '精良图纸',
  prototype: '原型图纸',
}

export function createBlueprintState() {
  return {
    blueprints: RECIPES
      .filter((recipe) => (recipe.source || 'start') === 'start')
      .map((recipe) => recipe.id),
    blueprintUnlocks: {},
  }
}

export function ensureBlueprints(run) {
  if (!run) return []
  if (!Array.isArray(run.blueprints)) {
    run.blueprints = RECIPES
      .filter((recipe) => (recipe.source || 'start') === 'start')
      .map((recipe) => recipe.id)
  }
  if (!run.blueprintUnlocks || typeof run.blueprintUnlocks !== 'object') run.blueprintUnlocks = {}
  return run.blueprints
}

export function recipeKnown(run, recipeId) {
  ensureBlueprints(run)
  return run.blueprints.includes(recipeId)
}

export function blueprintTierLabel(recipe) {
  return TIERS[recipe?.tier || 'standard'] || TIERS.standard
}

export function recipeSourceLabel(recipe) {
  if (recipe?.source === 'boss') return '首领掉落'
  if (recipe?.source === 'elite') return '精英掉落'
  if (recipe?.source === 'city') return '城市解锁'
  return '初始掌握'
}

export function knownRecipes(run) {
  ensureBlueprints(run)
  return RECIPES.filter((recipe) => run.blueprints.includes(recipe.id))
}

export function unlockBlueprint(run, recipeId, source = 'unknown') {
  ensureBlueprints(run)
  const recipe = RECIPES.find((item) => item.id === recipeId)
  if (!recipe) return null
  if (run.blueprints.includes(recipeId)) {
    return { ok: false, recipe, message: '这张图纸已经掌握了' }
  }
  run.blueprints.push(recipeId)
  run.blueprintUnlocks[recipeId] = { source, day: run.day }
  return { ok: true, recipe, message: `获得${TIERS[recipe.tier || 'standard']}：${recipe.name}` }
}

export function unlockBossBlueprint(run) {
  const results = [BOSS_BLUEPRINT, 'aegis']
    .map((id) => unlockBlueprint(run, id, 'boss'))
    .filter((result) => result?.ok)
  return {
    ok: results.length > 0,
    recipe: results[0]?.recipe || null,
    recipes: results.map((result) => result.recipe),
  }
}
