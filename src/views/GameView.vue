<script setup lang="ts">
import { ref, reactive, watch, onBeforeMount, onMounted } from "vue";
import { ExternalLink, ChartDots } from "@vicons/tabler";
import { useGameStore } from "@/stores/game";
import { useUsersStore } from "@/stores/users";
import { useStateStore } from "@/stores/state";
import { useLoadingBar, useNotification, NIcon, NAlert, NTable, NText, NModal, NButton, NButtonGroup, NFlex, NFormItem, NInputNumber, NForm, NCard } from 'naive-ui'
import { storeToRefs } from 'pinia'
import aardio from '@/aardio';

const notifacation = useNotification()
const state = useStateStore()
const users = useUsersStore()
const game = useGameStore()
const loadingBar = useLoadingBar()
const showSettings = ref(false)
const { index, filename, gamelog, filenames, players, markRank, markWinRate, showSeasonWinRate, kdaRecents, war3FullScreenHotkey } = storeToRefs(game)
const war3Hotkey = ref("")
const headers = reactive([
  { label: '楼层', key: 'id', width: '40', hidden: true },
  { label: '头像', key: 'avatar', width: '40', hideLabel: true, class: 'p-0' },
  { label: '玩家', key: 'username', width: '100' },
  { label: '等级', key: 'level', width: '46' },
  { label: '英雄', key: 'hero', width: '40', hideLabel: true, class: 'p-0' },
  { label: '技能', key: 'skills', width: '80', hidden: true, class: 'p-0' },
  { label: '段位', key: 'score', width: '75', class: 'p-0' },
  { label: '排名', key: 'rank', width: '60' },
  { label: '场均KDA', key: 'kda', width: '82' },
  { label: '胜率', key: 'winRate', width: '60' },
  { label: '赛季', key: 'seasonWinRate', width: '60', hidden: !showSeasonWinRate.value },
  { label: '胜场', key: 'totalWin', width: '60', hidden: true },
  { label: '局数', key: 'total', width: '85' },
  { label: '成就值', key: 'achieveScore', width: '30', hidden: true, hideLabel: true },
  { label: '成就', key: 'achieve', width: '390' },
  { label: '链接', key: 'link', width: '100', hideLabel: true },
])
function exploreGamelog() {
  aardio.run(`process.exploreSelect("${game.gamelogPath}/${filename.value} ")`)
}
function showGamelog(latest = false) {
  loadingBar.start()
  const lastFilename = filenames.value[filenames.value.length - 1]
  game.fetchGamelog(latest ? 0 : index.value).then(gamelog => {
    if (gamelog) {
      if (gamelog.mapVersion == 'v6.88s_OMG_3z' || gamelog.mapVersion == 'v6.88s_OMG_4f') {
        notifacation['warning']({
          content: '注意',
          meta: '当前版本OMG地图不支持显示技能',
          duration: 2500,
          keepAliveOnHover: true
        })
      }
      if (latest && lastFilename && gamelog.filename > lastFilename) {
        index.value++
      }
      filename.value = filenames.value[filenames.value.length - 1 - index.value]
      headers[5].hidden = (gamelog.showSkills) ? false : true
      game.updatePlayers(gamelog).then(() => loadingBar.finish())
    } else {
      loadingBar.error()
    }
    index.value = Math.max(0, Math.min(index.value, filenames.value.length - 1))
  })
}
function floorColor(index: number) {
  return index < 5 ? 'success' : 'error'
}
watch(markRank, () => {
  localStorage.setItem('@markRank', markRank.value.toString())
})
watch(markWinRate, () => {
  localStorage.setItem('@markWinRate', markWinRate.value.toString())
})
watch(kdaRecents, () => {
  localStorage.setItem('@kdaRecents', kdaRecents.value.toString())
})
watch(war3FullScreenHotkey, () => {
  handleHotkey()
  localStorage.setItem('@war3FullScreenHotkey', war3FullScreenHotkey.value.toString())
})
function handleShowSeasonWinRate() {
  showSeasonWinRate.value = !showSeasonWinRate.value;
  headers[10].hidden = !showSeasonWinRate.value
  localStorage.setItem('@showSeasonWinRate', showSeasonWinRate.value.toString())
}
const war3FullScreenSwitchAardioCode = `
config.script_魔兽窗口全屏切换 = ""
if (winform.war3FullScreenSwitch) {
  return {false, winform.war3FullScreenSwitch}
} else {
  winform.war3FullScreenSwitch = winform.reghotkey(
    function(id, mod, vk){
      hwnd = win.find(,"Warcraft III")
      _, _, width, height = win.getPos(win.getDesktop())
      if(hwnd){
        _, _, w, h = win.getPos(hwnd)
        if(w < width){
          win.modifyStyle(hwnd, 0xCF0000/*_WS_OVERLAPPEDWINDOW*/)
          win.setPos(hwnd, 0, 0, width, height)
        }else{
          win.modifyStyle(hwnd,,0xCF0000/*_WS_OVERLAPPEDWINDOW*/)
          win.setPos(hwnd, 50, 50, 1280, 720)
        }
      }
    },2/*_MOD_CONTROL*/,0x70/*_VK_F1*/
  )
  return {true, winform.war3FullScreenSwitch}
}`
function handleHotkey() {
  if (war3FullScreenHotkey.value) {
    aardio.run(war3FullScreenSwitchAardioCode).then(([registered, hotKeyId]) => {
      war3Hotkey.value = hotKeyId
    })
  } else {
    aardio.run(`winform.unreghotkey(winform.war3FullScreenSwitch);winform.war3FullScreenSwitch = null`).then(() => {
      war3Hotkey.value = ""
    })
  }
}
onBeforeMount(() => {
  users.pullLocalStorage()
  game.fetchGamelogPath().then(() => {
    showGamelog(true)
  })
  aardio.on('update', () => showGamelog(true))
  handleHotkey()
})
onMounted(() => {
  // @ts-ignore
  window.game = game
})
</script>

<template>
  <n-table striped>
    <thead>
      <tr>
        <td v-for="header in headers.filter((header) => !header.hidden)" :class="header.class" :key="header.key" :width="header.width">{{ header.hideLabel ? "" : header.label }}</td>
      </tr>
    </thead>
    <tbody>
      <tr> </tr>
      <tr v-for="(player, index) in players" :key="index">
        <td v-for="header in headers.filter((header) => !header.hidden)" :key="header.key" :class="{ 'p-0': header.class == 'p-0', 'local-player': gamelog?.localPlayerIndex == index, 'local-player-dark': gamelog?.localPlayerIndex == index && state.darkMode, 'dark-border': state.darkMode }">
          <template v-if="header.key === 'avatar'">
            <img :src="player.avatarUrl" width="40" height="40" />
          </template>
          <template v-else-if="header.key === 'username'">
            <n-text :type="floorColor(index)" tag="a" :href="player.url" target="_blank">{{ player.username }}</n-text>
          </template>
          <template v-else-if="header.key === 'hero'">
            <img v-if="player.hero" :src="player.heroUrl" width="40" height="40" />
          </template>
          <template v-else-if="header.key === 'skills'">
            <img v-if="player.skill1" :src="player.skill1Url" :title="player.title1" width="40" height="40" />
            <img v-if="player.skill2" :src="player.skill2Url" :title="player.title2" width="40" height="40" />
          </template>
          <template v-else-if="header.key === 'score'">
            <img :src="player.scoreUrl" width="38" height="38" />
            <n-text :type="floorColor(index)">{{ player.scoreDisplay }}</n-text>
          </template>
          <template v-else-if="header.key === 'rank' && player.rank">
            <n-text :type="floorColor(index)" :bordered="false" round v-if="markRank < player.rank">{{ player.rank }}</n-text>
            <n-button size="tiny" :type="floorColor(index)" :bordered="false" round style="font-size: medium;" v-else>{{ player.rank }}</n-button>
          </template>
          <template v-else-if="header.key === 'total' && player.totalTimes">
            <n-text :type="floorColor(index)">{{ `${player.totalWin}/${player.totalTimes}` }}</n-text>
          </template>
          <template v-else-if="header.key === 'winRate' && player.totalTimes">
            <n-text v-if="markWinRate / 100 > player.winRate" :type="floorColor(index)" style="margin-left: 10px;">{{ (player.winRate * 100).toFixed(0) + "%" }}</n-text>
            <n-button v-else size="tiny" :type="floorColor(index)" :bordered="false" round style="font-size: medium;">{{ (player.winRate * 100).toFixed(0) + "%" }}</n-button>
          </template>
          <template v-else-if="header.key === 'seasonWinRate' && player.totalTimes">
            <n-text v-if="markWinRate / 100 > player.seasonWinRate" :type="floorColor(index)" style="margin-left: 10px;">{{ (player.seasonWinRate * 100).toFixed(0) + "%" }}</n-text>
            <n-button v-else size="tiny" :type="floorColor(index)" :bordered="false" round style="font-size: medium;">{{ (player.seasonWinRate * 100).toFixed(0) + "%" }}</n-button>
          </template>
          <template v-else-if="header.key === 'link' && player.userid">
            <n-text :type="floorColor(index)" tag="a" :href="player.url" target="_blank">
              <n-icon size="24" :component="ExternalLink"> </n-icon>
            </n-text>
            <n-text :type="floorColor(index)" tag="a" :href="player.curveUrl" target="_blank" class="ps-1">
              <n-icon size="24" :component="ChartDots"> </n-icon>
            </n-text>
          </template>
          <template v-else-if="header.key === 'achieve'">
            <n-text :type="floorColor(index)"><span v-if="player.achieveScore">{{ `[${player.achieveScore}] ` }} </span>{{ player.achieve }}</n-text>
          </template>
          <template v-else>
            <n-text :type="floorColor(index)">{{ Object(player)[header.key] }}</n-text>
          </template>
        </td>
      </tr>
    </tbody>
  </n-table>
  <n-flex style="margin-top: 10px;">
    <n-button size="tiny" round secondary type="info" @click="index = 0; filename = filenames[filenames.length - 1]" title="返回最新">{{ index + 1 }}</n-button>
    <n-button size="tiny" round secondary type="success">{{ gamelog?.mapVersion }}</n-button>
    <n-button size="tiny" round secondary type="warning">{{ gamelog?.gameSourceName }}</n-button>
    <n-button size="tiny" round secondary :type="showSeasonWinRate ? 'warning' : 'tertiary'" @click="handleShowSeasonWinRate()">显示赛季胜率</n-button>
    <n-button size="tiny" round secondary type="error" v-if="gamelog?.rankIdCount != 10">未分边</n-button>
    <n-button size="tiny" round secondary @click="exploreGamelog()">{{ filename }}</n-button>
    <n-button size="tiny" round secondary type="primary" @click="showSettings = true">表格设置</n-button>
    <n-button size="tiny" round secondary :type="war3FullScreenHotkey ? 'info' : 'tertiary'" @click="war3FullScreenHotkey = !war3FullScreenHotkey">War3窗口化热键(CTRL+F1)({{ war3Hotkey ? "已开启" : "未开启" }})</n-button>
    <n-modal v-model:show="showSettings" preset="dialog" title="Dialog">
      <template #header>
        <div>表格设置</div>
      </template>
      <n-form-item label="场均KDA统计最近局数" style="margin-top: 30px;width:48%;">
        <n-input-number v-model:value="kdaRecents" :min="1" :max="100" />
      </n-form-item>
      <n-form inline>
        <n-form-item label="标记排名" style="">
          <n-input-number v-model:value="markRank" :min="1" :max="9999" />
        </n-form-item>
        <n-form-item label="标记胜率" style="">
          <n-input-number v-model:value="markWinRate" :min="1" :max="100" />
        </n-form-item></n-form>
    </n-modal>
  </n-flex>
  <n-button-group style="width: 100%;margin-top: 10px;">
    <n-button @click="index++; showGamelog()" round style="width: 50%;">上一页</n-button>
    <n-button @click="index--; showGamelog()" round :disabled="index == 0" style="width: 50%;">下一页</n-button>
  </n-button-group>
</template>
<style scoped>
.p-0 {
  padding: 0;
}

td {
  /* height: 41px; */
  padding-top: 0;
  padding-bottom: 0;
  padding-right: 0;
}


td.local-player {
  background-color: #6aac9034 !important;
}

td.local-player-dark {
  background-color: #42ab9475 !important;
}

td>a,
td>code {
  /* color: inherit !important; */
  text-decoration: none !important;
}

img,
svg {
  vertical-align: middle;
}
</style>