import { defineStore, acceptHMRUpdate } from 'pinia'
import axios from 'axios';
import { reactive } from 'vue';

export const useUsersStore = defineStore('users', () => {
  const users: Record<string, User> = reactive({})
  function pullLocalStorage() {
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key && !key.startsWith('@')) {
        const userData = localStorage.getItem(key)!.split(",")
        if (userData.length == 4) {
          let [userid, avatar, level, flag] = userData.map((x: string) => parseInt(x))
          users[key] = { userid, avatar, avatarUrl: `https://cdn.09game.com/resources/head/head_${avatar}_40.png`, level, flag, flags: getFlags(flag) }
        }
      }
    }
  }
  function pushLocalStorage() {
    try {
      for (let key in users) {
        let { userid, avatar, level, flag } = users[key]
        localStorage.setItem(key, `${userid},${avatar},${level},${flag}`)
      }
    } catch (error) {
      clearLocalStorage()
    }
  }
  function clearLocalStorage() {
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      key && !key.startsWith('@') && localStorage.removeItem(key);
    }
  }
  const getFlags = (flag: number) => [...flag.toString(2)].reverse().map((v, i) => v === '1' ? i + 1 : -1).filter(v => v !== -1);

  async function get(username: string): Promise<User> {
    let [userid, avatar, level, flag] = localStorage.getItem(username)?.split(",").map((x: string) => parseInt(x)) || [0, 0, 0, 0]
    if (!userid) {
      try {
        let res = await axios.get(`https://users.09game.com/home/GetUserPub?user_name='${username}'`)
        let data = res.data;
        if (data.result === 0) {
          userid = data.temp[0].user_id
          avatar = data.temp[0].avatar_head
          level = data.temp[0].level
          flag = data.temp[0].flag
          localStorage[username] = `${userid},${avatar},${level},${flag}`
        }
      } catch (error) { }
    }

    const flags = getFlags(flag)
    const avatarUrl = `https://cdn.09game.com/resources/head/head_${avatar}_40.png`
    return { userid, avatar, avatarUrl, level, flag, flags }
  }

  return { get, clearLocalStorage, pullLocalStorage, pushLocalStorage, users }
})

export interface User {
  userid: number;
  avatar: number;
  avatarUrl: string;
  level: number;
  flag: number;
  flags: number[];
}

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUsersStore, import.meta.hot))
}
