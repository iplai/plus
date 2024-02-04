import { defineStore, acceptHMRUpdate } from 'pinia'
import aardio from '@/aardio'
import axios from 'axios'
import { useUsersStore } from './users'


export const useGameStore = defineStore({
  id: 'game',
  state: () => ({
    index: 0,
    gamelogPath: '',
    gamelogs: {} as Record<string, Gamelog>,
    filename: '',
    markRank: parseInt(localStorage.getItem('@markRank') || '100'),
    markWinRate: parseInt(localStorage.getItem('@markWinRate') || '70'),
    kdaRecents: parseInt(localStorage.getItem('@kdaRecents') || '10'),
    showSeasonWinRate: localStorage.getItem('@showSeasonWinRate') === 'true',
    war3FullScreenHotkey: localStorage.getItem('@war3FullScreenHotkey') !== 'false',
  }),
  getters: {
    filenames(state) {
      return Object.keys(state.gamelogs).sort()
    },
    gamelog(state) {
      return state.filename ? state.gamelogs[state.filename] : null
    },
    players(state) {
      return state.filename ? state.gamelogs[state.filename].players : []
    }
  },
  actions: {
    async fetchGamelogPath() {
      this.gamelogPath = await aardio.run(`
      if (io.exist("C:\\ProgramData\\09Game\\config.ini")) {
        var ini = fsys.ini("C:\\ProgramData\\09Game\\config.ini")
        var gamelogPath = fsys.joinpath(fsys.getParentDir(ini.read("war3", "path")), "DotA_Log", "日志")
        if (io.exist(gamelogPath)) {
          return gamelogPath
        }
      }
      return '' `)
    },
    async fetchGamelog(index = 0) {
      if (!this.gamelogPath) return null
      const { filename, lines } = await aardio.run(`
      var index = ${index}
      var files = {}
      fsys.enum("${this.gamelogPath}", "*.log", function(dirname, filename, fullpath, findData){
          if (filename) table.push(files, {fullpath=fullpath, filename=filename})
      })
      if (#files == 0) return {lines={}, filename=null}
      var fileIndex = (#files - index <= 1) ? 1 : (#files - index)
      fileIndex = (fileIndex > #files) ? #files : fileIndex
      var fullpath = files[fileIndex].fullpath
      var filename = files[fileIndex].filename
      var gamelog = {lines={}, filename=filename}
      for line in io.lines(fullpath){
          table.push(gamelog.lines, line)
      }
      return gamelog`)
      if (!filename) return null
      parseGamelog(lines, filename, this.gamelogs)
      const gamelog = this.gamelogs[filename]
      for (let index = 0; index < gamelog.players.length; index++) {
        const player = gamelog.players[index];
        if (gamelog.mapVersion == 'v6.88s_OMG_3z' || gamelog.mapVersion == 'v6.88s_OMG_4f') {
          player.skill1Url = `https://cdn.09game.com/resources/game_item/${ConvertWar3Id(player.skill1)}.jpg`
          player.skill2Url = `https://cdn.09game.com/resources/game_item/${ConvertWar3Id(player.skill2)}.jpg`
        } else {

          player.skill1Url = `https://cdn.09game.com/resources/game_skill/${ConvertWar3Id(player.skill1)}.jpg`
          player.skill2Url = `https://cdn.09game.com/resources/game_skill/${ConvertWar3Id(player.skill2)}.jpg`
        }
        player.heroUrl = `https://cdn.09game.com/resources/game_avator/${ConvertWar3Id(player.hero)}.jpg`
        player.avatarUrl = `https://cdn.09game.com/resources/head/head_0_40.png`
        player.scoreUrl = player.scoreUrl || `https://www.09game.com/statics/IMsegment/0/1.png`
      }
      return gamelog
    },
    async updatePlayers(gamelog: Gamelog) {
      const users = useUsersStore()
      for (const player of gamelog.players) {
        users.get(player.username).then(user => {
          Object.assign(player, user)
          if (player.userid) {
            player.url = `https://www.09game.com/html/2020gamescore/web/?userid=${player.userid}&type=${gamelog.gameType || 1}`
            player.curveUrl = `/09/charts/${gamelog.gameTypeName}.html?gs=3&userid=${player.userid}`
            if (!player.score) {
              const userid = player.userid;
              player.score = 100;
              player.arenaScore = 0;

              axios.get(`https://score.09game.com/Ordinary/SeasonSummary?UserID=${userid}&GameTypeID=${gamelog.gameType}`).then(res => {
                if (res.data["data"]) {
                  if (res.data["data"]["season"].length > 0) {
                    player.score = res.data["data"]["season"][0]["score"] || res.data["data"]["season"][0]["single_score"];
                    player.arenaScore = res.data["data"]["season"][0]["arena_score"];
                    const a = res.data["data"]["season"][0]["total_win"];
                    const b = res.data["data"]["season"][0]["total_times"];
                    player.seasonWinRate = a / b
                  } else {
                    player.seasonWinRate = 0;
                  }
                  if (res.data["data"]["total"].length > 0) {
                    player.totalWin = res.data["data"]["total"][0]["total_win"];
                    player.totalTimes = res.data["data"]["total"][0]["total_times"];
                    player.winRate = player.totalWin / player.totalTimes
                  } else {
                    player.totalWin = 0;
                    player.totalTimes = 0;
                    player.winRate = 0;
                  }
                }
                player.scoreUrl = player.score < 1600 ? `https://www.09game.com/statics/IMsegment/0/${Math.round(player.score / 100)}.png` : `https://www.09game.com/statics/IMsegment/0/16.png`;
                player.scoreDisplay = scoreToScoreDisplay(player.score, player.arenaScore);
              })

              axios.get(`https://score.09game.com/MOBA/UserRanking?gameTypeId=${gamelog.gameType}&UserID=${userid}`).then(res => {
                if (res.data["data"].length > 0) {
                  player.rank = res.data["data"][0]["rank_number"] || res.data["data"][0]["rank_number1"];
                }
              })

              axios.get(`https://score.09game.com/MOBA/BasicDataList?UserID=${userid}&GameTypeID=${gamelog.gameType}&CurrentSeason=0&GameSource=${gamelog.gameSource}&Time=-1&PageIndex=0&PageSize=${this.kdaRecents}`).then(res => {
                player.kda = "";
                if (res.data['code'] == 0) {
                  const items = res.data['data']['listEntity'];
                  if (items.length > 0) {
                    // @ts-ignore
                    const { k, d, a } = items.reduce((acc, item) => {
                      acc.k += parseInt(item['kill_count']);
                      acc.d += parseInt(item['killed_count']);
                      acc.a += parseInt(item['assist_count']);
                      return acc;
                    }, { k: 0, d: 0, a: 0 });

                    const avgK = k / items.length;
                    const avgD = d / items.length;
                    const avgA = a / items.length;

                    player.kda = `${Math.round(avgK)}/${Math.round(avgD)}/${Math.round(avgA)}`;
                  }
                }
              })

              axios.get(`https://users.09game.com/Home/GetUserAchievement?user_id=${userid}`).then(res => {
                player.achieveScore = res.data["temp"]["total_score"];
              })
            }
          }
        })
      }
    }
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useGameStore, import.meta.hot))
}

export interface Player {
  username: string
  userid: number
  slot: number
  score: number
  arenaScore: number
  scoreDisplay: number | string
  scoreUrl: string
  curveUrl: string
  skill1Url: string
  skill1: string
  title1: string
  skill2Url: string
  skill2: string
  title2: string
  hero: string
  achieve: string
  achieveScore: number
  totalWin: number
  totalTimes: number
  winRate: number
  seasonWinRate: number
  rank: number | null
  url: string
  avatarUrl: string
  heroUrl: string
  kda: string
}

export interface Gamelog {
  filename: string
  lines: string[]
  index: number,
  rankIdCount: number,
  heroCount: number,
  achieveCount: number,
  skillsCount: number,
  localSlot: number | null,
  localPlayerIndex: number,
  gameType: number,
  gameTypeName: string
  showSkills: boolean,
  gameSource: number | null,
  gameSourceName: string
  mapVersion: string,
  players: Player[],
  slots: { [key: number | string]: number },
  chats: string[],
}



function scoreToScoreDisplay(score: number, arenaScore: number) {
  if (score >= 1600) {
    return arenaScore
  }
  if (score >= 700 && score < 1600) {
    return (Math.round(score / 100) - 6 + (score % 10) / 10).toFixed(1)
  }
  if (score < 700) {
    return ((score % 10) / 10).toFixed(1)
  }
  return score
}
const gameTypes: { [key: string]: string } = { 0: "RPG", 1: "DOTA", 2: "IM", 21: "OMG", 153: "DS", 142: "RB" }
const gameTypesHasSkills = [21, 153, 142]
function parseGamelog(lines: string[], filename: string, gamelogs: { [filename: string]: Gamelog }) {
  if (!(filename in gamelogs)) {
    gamelogs[filename] = {
      filename,
      index: 0,
      rankIdCount: 0,
      heroCount: 0,
      achieveCount: 0,
      skillsCount: 0,
      localSlot: null,
      localPlayerIndex: 0,
      gameType: 0,
      gameTypeName: '',
      showSkills: false,
      gameSource: null,
      gameSourceName: '',
      mapVersion: '',
      // @ts-ignore
      players: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}],
      slots: { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 7: 5, 8: 6, 9: 7, 10: 8, 11: 9 },
      chats: [],
    }
  }
  const gamelog = gamelogs[filename]
  const players = gamelog.players
  const slots = gamelog.slots

  for (let index = gamelog.index; index < lines.length; index++) {
    const line = lines[index];
    if (index == 1) {
      gamelog.mapVersion = line.match(/version = ([\w\.]+)/)?.pop() || ''
      gamelog.gameType = mapVersionToGameType(gamelog.mapVersion)
      gamelog.gameTypeName = gameTypes[gamelog.gameType || 0]
      gamelog.showSkills = gameTypesHasSkills.includes(gamelog.gameType || 0)
    } else if (!players[9].username) {
      const pattern = gamelog.gameTypeName != 'DS' ? /玩家\[(\d+)\]\[(.*)\]/ : /玩家(\d+)-(.*)/
      const match = line.match(pattern)
      if (match) {
        const [, _slot, username] = match
        const slot = parseInt(_slot) - 1
        if (slot in slots) {
          players[slots[slot]].username = username
          players[slots[slot]].slot = slot
        }
      }
    } else if (gamelog.localSlot === null) {
      const pattern = gamelog.gameTypeName != 'DS' ? /本地玩家\[(\d+)\]\[.*\]/ : /本地玩家(\d+)-(.*)/
      const match = line.match(pattern)
      if (match) {
        const [, _slot] = match
        gamelog.localSlot = parseInt(_slot) - 1
      }
    }
    else {
      if (gamelog.gameSource === null) {
        const match = line.match(/09game EXSYGetGameSource, (\d+)\(number\)/)
        if (match) {
          const [, _gameSource] = match
          gamelog.gameSource = parseInt(_gameSource)
          gamelog.gameSourceName = { 0: '自建房', 3: '赛季', 4: '自由' }[gamelog.gameSource] || ""
        }
      }
      if (gamelog.rankIdCount < 10) {
        const match = line.match(/\[rank\] (\d+), id, (\d+), p：1/)
        if (match) {
          const [_, _slot, _floor] = match
          slots[_slot] = parseInt(_floor) - 1
          gamelog.rankIdCount++
        }
        if (gamelog.rankIdCount == 10) {
          players.sort((a, b) => slots[a.slot] - slots[b.slot])
          gamelog.localPlayerIndex = slots[gamelog.localSlot]
        }
      }
      if (gamelog.heroCount < 20) {
        const match = line.match(/\[rank\] (\d+), 9, (\d+), p：1/)
        if (match) {
          const [, _slot, _hero] = match
          players[slots[_slot]].hero = _hero
          gamelog.heroCount++
          continue
        }
      }
      if (gamelog.achieveCount < 10) {
        const match = line.match(/09game EXSYCallParam2\(10001, (\d+), chenju\) \d+,(.*?)\(string\)/)
        if (match) {
          const [, _slot, _achieve] = match
          players[slots[_slot]].achieve = parseAchieve(_achieve)
          gamelog.achieveCount++
          continue
        }
      }
      if (gameTypesHasSkills.includes(gamelog.gameType) && gamelog.skillsCount < 20) {
        if (gamelog.mapVersion == 'v6.88s_OMG_3z' || gamelog.mapVersion == 'v6.88s_OMG_4f') {
          const match = line.match(/\[rank\] (\d+), 8_([0-5]), (\d+), p：1/)
          if (match) {
            const [, _slot, _index, _skill] = match
            const player = players[slots[_slot]]
            if (_skill && !player.skill1) player.skill1 = _skill
            if (_skill && _skill != '0') player.skill2 = _skill
            continue
          }
        } else {
          const match = line.match(/\[rank\] (\d+), 12_([4,5]), (\d+), p：1/)
          if (match) {
            const [, _slot, _index, _skill] = match
            const player = players[slots[_slot]]
            if (_index == '4') {
              player.skill1 = _skill
              if (_skill == '0') {
                player.title1 = lines[index - 13].split('\t')[1]
              }
            }
            if (_index == '5') {
              player.skill2 = _skill
              if (_skill == '0') {
                player.title2 = lines[index - 13].split('\t')[1]
              }
              gamelog.skillsCount++
            }
            continue
          }
        }

      }
      const match = line.match(/\[聊天\](.*)/)
      if (match) {
        const [_, chat] = match
        gamelog.chats.push(`[${line.slice(0, 19)}] ${chat}`)
        continue
      }
    }
  }
  gamelog.index = lines.length - 1
}
function mapVersionToGameType(mapVersion: string) {
  for (const [key, name] of Object.entries(gameTypes)) {
    if (mapVersion.match(new RegExp(name, 'i'))) {
      return parseInt(key)
    }
  }
  return 1
}
function parseAchieve(achieve: string) {
  if (achieve == '-1') return "";
  const achievementsDict = { A: ["攻击", 1], B: ["攻速", 0], C: ["移速", 0], D: ["力量", 0], E: ["敏捷", 0], F: ["智力", 0], G: ["血量", 1], H: ["蓝量", 1], I: ["金钱", 0], J: ["经验", 1], K: ["回血", 0], L: ["回蓝", 0], M: ["护甲", 0], N: ["魔抗", 1], O: ["法术吸血", 1], P: ["物理吸血", 1], }
  return achieve
    .split(";")
    .filter(item => item)
    .map(item => {
      const [key, value] = item.split("=")
      // @ts-ignore
      const { 0: name, 1: type } = achievementsDict[key]
      return type === 0
        ? `${name}+${Number(value) / 100}`
        : `${name}+${value}%`
    })
    .join(",");
}

function ConvertWar3Id(_id: string) {
  const id = Number(_id)
  if (id <= 0) return "0000"
  var t1 = String.fromCharCode(id & 255)
  var t2 = String.fromCharCode((id >> 8) & 255)
  var t3 = String.fromCharCode((id >> 16) & 255)
  var t4 = String.fromCharCode((id >> 24) & 255)
  return t4 + t3 + t2 + t1
}