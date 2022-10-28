const nodecron = require('node-cron')

const cron = require('./crontask')
const schedule = require('./schedule')
const { exec } = require('./exec')
const { runJSFile } = require('../script/runJSFile')

const { logger, feedAddItem, sType, sJson, list, file, wsSer, euid, eAxios } = require('../utils')
const clog = new logger({ head: 'funcTask', cb: wsSer.send.func('tasklog'), file: 'funcTask' })

class Task {
  constructor(info, job=null){
    this.info = info
    this.job = job || jobFunc(info.job, { taskname: info.name, taskid: info.id })
  }

  stat(){
    return Boolean(this.info.running)
  }

  start(){
    if (!bIsValid(this.info)) {
      return false
    }
    if (this.info.type === 'cron') {
      this.task = new cron(this.info, this.job)
      this.task.start()
      feedAddItem(`start crontask ${this.info.name}`, 'time: ' + this.info.time)
    } else if (this.info.type === 'schedule') {
      this.task = new schedule(this.info, this.job)
      this.task.start()
      feedAddItem(`start scheduletask ${this.info.name}`, 'time: ' + this.info.time)
    } else {
      clog.error('task type only support: cron/schedule')
    }
  }

  stop(flag = 'stopped'){
    if(this.task) {
      if (flag === 'stopped') {
        feedAddItem(this.info.name + ' stopped', 'time: ' + this.info.time)
      }
      this.task.stop(flag)
    }
  }

  delete(flag = 'delete'){
    if(this.task) {
      if (flag === 'delete') {
        feedAddItem(this.info.name + ' deleted', 'time: ' + this.info.time)
      }
      this.task.delete(flag)
      delete this.task
    }
  }
}

const TASKS_INFO = {}             // 任务信息列表
const TASKS_WORKER = {}           // 执行任务列表

function bIsValid(info) {
  // 任务合法性检测
  if (sType(info) !== 'object') {
    clog.error('a task object is expect')
    return false
  }
  if (info.name === undefined) {
    clog.error('no task name')
    return false
  }
  if (!/cron|schedule|sub/.test(info.type)) {
    clog.error(info.name, 'unknow task type', info.type)
    return false
  }
  if ((info.update_type || info.type) === 'cron' && !nodecron.validate(info.time)) {
    clog.error(info.name, info.type, 'wrong cron time format:', info.time)
    return false
  }
  let ftime = info.time?.split(' ')
  if ((info.update_type || info.type) === 'schedule' && ftime.filter(t=>/^\d+$/.test(t)).length !== ftime.length) {
    clog.error(info.name, info.type, 'wrong schedule time format:', info.time)
    return false
  }
  if (!(info.job && info.job.type && info.job.target)) {
    clog.error('a task job is expect')
    return false
  }
  return true
}

function jobFunc(job, { taskname, taskid }) {
  // 任务信息转化为可执行函数
  if (!(job && job.target)) {
    clog.error('a job target is expect')
    return ()=>'a job target is expect'
  }
  if (job.type === 'runjs') {
    return ()=>runJSFile(job.target, {
      from: 'task',
      __taskid: taskid,
      __taskname: taskname,
      cb: wsSer.send.func('tasklog')
    })
  } else if (job.type === 'taskstart') {
    return ()=>{
      if (!TASKS_INFO[job.target]) {
        clog.error('start task error:', job.target, 'not exist')
        return {
          error: `${job.target || 'task'} not exist`
        }
      }
      if (!TASKS_WORKER[job.target]) {
        TASKS_WORKER[job.target] = new Task(TASKS_INFO[job.target])
      }
      TASKS_WORKER[job.target].start()
    }
  } else if (job.type === 'taskstop') {
    return ()=>{
      if (!TASKS_INFO[job.target] || !TASKS_WORKER[job.target]) {
        clog.error('stop task error:', job.target, 'not exist')
        return {
          error: `${job.target || 'task'} not exist`
        }
      }
      TASKS_WORKER[job.target].stop()
      TASKS_WORKER[job.target].delete('stop')
      TASKS_WORKER[job.target] = null
    }
  } else if (job.type === 'exec') {
    return ()=>new Promise((resolve)=>{
      exec(job.target, {
        from: 'task',
        cb(data, error, finish){
          if (finish) {
            resolve(data)
          } else if (error) {
            resolve(error)
          }
        },
        logname: taskname + '.task'
      })
    })
  } else {
    clog.error('unknow job type')
    return ()=>'unknow job type'
  }
}

const taskMan = {
  add(taskinfo, options={}){
    let tname = this.nameList()
    let resmsg = {
        rescode: 0,
        message: ''
      }
    let addtask = (taskinfo) => {
      let message = ''
      if (!bIsValid(taskinfo)) {
        message = 'some task parameters may be invalid(please check docs: https://github.com/elecV2/elecV2P-dei/blob/master/docs/06-task.md)'
        clog.info(taskinfo || '', message)
        resmsg.message += '\n' + message
        return
      }

      let tid = taskinfo.id;         // 带 id 添加的任务将无视同名任务更新规则
      if (!tid && options.type && tname[taskinfo.name]) {
        clog.info(taskinfo.name, 'exist, new task add type:', options.type)
        switch(options.type) {
        case 'skip':
          message = 'skip add task ' + taskinfo.name
          clog.info(message)
          resmsg.message += '\n' + message
          return
          break
        case 'addition':
          tid = euid()
          message = 'add new task ' + taskinfo.name
          break
        case 'replace':
          tid = tname[taskinfo.name]
          message = 'replace task ' + taskinfo.name
          break
        default:
          clog.error('unknow type of task add options', options.type)
        }
      }

      if (!tid) {
        tid = euid()
      }
      if (TASKS_WORKER[tid]) {
        clog.info('delete old task', TASKS_INFO[tid].name, 'data')
        if (TASKS_WORKER[tid].stat()) {
          TASKS_WORKER[tid].stop('restart')
        }
        TASKS_WORKER[tid].delete('restart')
        TASKS_WORKER[tid] = null
      }

      TASKS_INFO[tid] = taskinfo
      TASKS_INFO[tid].id = tid
      if (taskinfo.running !== false) {
        TASKS_WORKER[tid] = new Task(TASKS_INFO[tid])
        TASKS_WORKER[tid].start()
        message += ' TASK: ' + taskinfo.name + ' started'
      }
      if (!message) {
        message = 'add task: ' + taskinfo.name
      }
      clog.info(message)
      resmsg.message += '\n' + message
    }
    if (sType(taskinfo) === 'array') {
      taskinfo.forEach(task=>{
        addtask(task)
      })
    } else {
      addtask(taskinfo)
      resmsg.taskinfo = taskinfo
    }
    resmsg.message = resmsg.message.trim()
    return resmsg
  },
  start(tid){
    if (!tid) {
      return {
        rescode: -1,
        message: 'a task id is expect'
      }
    }

    let resmsg = {
        rescode: 0,
        message: ''
      }
    let starttask = (tid) => {
      let msg = ''
      if (TASKS_INFO[tid]) {
        if (!TASKS_WORKER[tid]) {
          TASKS_WORKER[tid] = new Task(TASKS_INFO[tid])
        }
        if (TASKS_INFO[tid].running === false) {
          TASKS_WORKER[tid].start()
          message = TASKS_INFO[tid].name + ' started'
        } else {
          message = TASKS_INFO[tid].name + ' is running'
        }
      } else {
        message = 'task ' + tid + ' not exist'
      }
      clog.info(message)
      resmsg.message += '\n' + message
    }
    if (sType(tid) === 'array') {
      tid.forEach(id=>{
        starttask(id)
      })
    } else {
      starttask(tid)
      resmsg.taskinfo = TASKS_INFO[tid]
    }
    resmsg.message = resmsg.message.trim()
    return resmsg
  },
  stop(tid){
    if (!tid) {
      return {
        rescode: -1,
        message: 'a task id is expect'
      }
    }
    let resmsg = {
        rescode: 0,
        message: ''
      }
    let stoptask = (tid) => {
      let msg = ''
      if (TASKS_WORKER[tid]) {
        TASKS_WORKER[tid].stop()
        TASKS_WORKER[tid].delete('stop')
        TASKS_WORKER[tid] = null
        msg = TASKS_INFO[tid].name + ' stopped'
      } else if (TASKS_INFO[tid]) {
        // 没有运行任务但存在任务信息
        msg = TASKS_INFO[tid].name + ' already stopped'
        clog.info(msg)
      } else {
        msg = 'task ' + tid + ' no exist'
        clog.info(msg)
      }
      resmsg.message += '\n' + msg
    }
    if (sType(tid) === 'array') {
      tid.forEach(id=>{
        stoptask(id)
      })
    } else {
      stoptask(tid)
      resmsg.taskinfo = TASKS_INFO[tid]
    }
    resmsg.message = resmsg.message.trim()
    return resmsg
  },
  delete(tid){
    if (!tid) {
      return {
        rescode: -1,
        message: 'a task id is expect'
      }
    }
    let resmsg = {
        rescode: 0,
        message: ''
      }
    let deltask = (tid) => {
      if (TASKS_WORKER[tid]) {
        TASKS_WORKER[tid].delete()
        delete TASKS_WORKER[tid]
      }
      let msg = ''
      if (TASKS_INFO[tid]) {
        msg = `TASK ${TASKS_INFO[tid].type} ${TASKS_INFO[tid].name} deleted`
        delete TASKS_INFO[tid]
      } else {
        msg = `TASK ${tid} not exist yet`
      }
      clog.info(msg)
      resmsg.message += '\n' + msg
    }
    if (sType(tid) === 'array') {
      tid.forEach(id=>{
        deltask(id)
      })
    } else {
      deltask(tid)
    }
    resmsg.message = resmsg.message.trim()
    return resmsg
  },
  async update(tid, type){
    if (TASKS_INFO[tid]?.type !== 'sub') {
      return {
        rescode: -1,
        message: `${tid} is not a sub type task`
      }
    }
    let taskinfo = null, errmsg = ''
    try {
      let res = await eAxios(TASKS_INFO[tid].job.target)
      if (res.data?.list.length) {
        taskinfo = res.data.list
      } else {
        errmsg = TASKS_INFO[tid].job.target + ' dont contain any task'
        clog.error(errmsg)
      }
    } catch(e) {
      errmsg = `task sub ${TASKS_INFO[tid].name} update fail`
      clog.error(errmsg, e)
    }
    if (taskinfo) {
      if (!type) type = TASKS_INFO[tid].job.type;
      taskinfo.forEach(s=>s.belong = tid)
      clog.notify('start update task sub:', TASKS_INFO[tid].name, 'same name task update type:', type)
      let resmsg = this.add(taskinfo, { type })
      wsSer.send({ type: 'task', data: { op: 'init' }})
      return resmsg
    }
    return {
      rescode: -1,
      message: errmsg,
    }
  },
  async test(taskinfo){
    if (!bIsValid(taskinfo)) {
      return {
        rescode: -1,
        message: 'some task parameters may be invalid'
      }
    }
    try {
      let job = jobFunc(taskinfo.job, { taskname: taskinfo.name + '-test', taskid: taskinfo.id })
      let jobres = await job()
      return {
        rescode: 0,
        message: jobres
      }
    } catch(e) {
      return {
        rescode: -1,
        message: e.message || e
      }
    }
  },
  nameList(){
    let tname = {}
    for (let tid in TASKS_INFO) {
      if (TASKS_INFO[tid].type === 'cron' || TASKS_INFO[tid].type === 'schedule') {
        tname[TASKS_INFO[tid].name] = tid
      }
    }
    return tname
  },
  info(tid = 'all'){
    if (tid === 'all') {
      return JSON.parse(JSON.stringify(TASKS_INFO))
    }
    return JSON.parse(JSON.stringify(TASKS_INFO[tid]))
  },
  status(){
    let status = {
      running: 0,
      total: 0,
      sub: 0
    }
    for (let tid in TASKS_INFO) {
      switch(TASKS_INFO[tid].type) {
      case 'sub':
        status.sub++
        break
      case 'cron':
      case 'schedule':
        status.total++
        if (TASKS_INFO[tid].running) {
          status.running++
        }
        break
      }
    }
    return status
  },
  startsub(tid){
    // start sub task cron/schedule
    if (TASKS_INFO[tid]?.type !== 'sub') {
      clog.error(TASKS_INFO[tid]?.name, 'is not a sub')
      return
    }
    if (TASKS_WORKER[tid]) {
      clog.info('delete old sub task worker of', TASKS_INFO[tid]?.name)
      TASKS_WORKER[tid].stop('restart')
      TASKS_WORKER[tid].delete('restart')
      TASKS_WORKER[tid] = null
    }
    switch (TASKS_INFO[tid].update_type) {
    case 'cron':
      if (bIsValid(TASKS_INFO[tid])) {
        clog.notify('set autoupdate for', TASKS_INFO[tid].name, 'cron time:', TASKS_INFO[tid].time)
        TASKS_WORKER[tid] = new cron(TASKS_INFO[tid], ()=>this.update(tid))
        TASKS_WORKER[tid].start()
      }
      break
    case 'schedule':
      if (bIsValid(TASKS_INFO[tid])) {
        clog.notify('set autoupdate for', TASKS_INFO[tid].name, 'schedule time:', TASKS_INFO[tid].time)
        TASKS_WORKER[tid] = new schedule(TASKS_INFO[tid], ()=>this.update(tid))
        TASKS_WORKER[tid].start()
      }
      break
    default:
      clog.info('no autoupdate for sub task:', TASKS_INFO[tid].name)
    }
  },
  save(taskobj){
    if (taskobj) {
      // 保存 taskobj 到 task.list 待优化
      if (sType(taskobj) !== 'object') {
        clog.error('fail to save', taskobj, 'to task.list')
        return {
          rescode: -1,
          message: 'a object task info is expect'
        }
      }
      for (let tid in taskobj) {
        // 逐项检测定时任务信息量是否有修改
        if (JSON.stringify(taskobj[tid]) !== JSON.stringify(TASKS_INFO[tid])) {
          switch (taskobj[tid].type) {
          case 'sub':
            TASKS_INFO[tid] = taskobj[tid]
            this.startsub(tid)
            break
          case 'group':
            TASKS_INFO[tid] = taskobj[tid]
            break
          case 'cron':
          case 'schedule':
            if (taskobj[tid].running) {
              // 运行中的任务修改判断
              // 需要重启的参数: 时间 任务
              // 不需重启的参数: 名称 belong group
              if (!TASKS_INFO[tid] || TASKS_INFO[tid].type !== taskobj[tid].type || TASKS_INFO[tid].time !== taskobj[tid].time || JSON.stringify(TASKS_INFO[tid].job) !== JSON.stringify(taskobj[tid].job)) {
                if (TASKS_WORKER[tid]) {
                  clog.info('delete old task data of', TASKS_INFO[tid].name)
                  if (TASKS_WORKER[tid].stat()) {
                    TASKS_WORKER[tid].stop('restart')
                  }
                  TASKS_WORKER[tid].delete('restart')
                  TASKS_WORKER[tid] = null
                }
                TASKS_INFO[tid] = taskobj[tid]
                TASKS_WORKER[tid] = new Task(TASKS_INFO[tid])
                TASKS_WORKER[tid].start()
              } else {
                Object.assign(TASKS_INFO[tid], taskobj[tid])
                if (!taskobj[tid].belong && TASKS_INFO[tid].belong) {
                  delete TASKS_INFO[tid].belong
                }
                if (!taskobj[tid].group && TASKS_INFO[tid].group) {
                  delete TASKS_INFO[tid].group
                }
              }
            } else {
              // 非运行中任务信息更新
              if (TASKS_WORKER[tid]) {
                TASKS_WORKER[tid].delete('stop')
                delete TASKS_WORKER[tid]
              }
              TASKS_INFO[tid] = taskobj[tid]
            }
            TASKS_INFO[tid].id = tid      // id 修正及兼容旧版
            break
          }
        }
      }
    }
    if (list.put('task.list', TASKS_INFO)) {
      let status = this.status()
      return {
        rescode: 0,
        message: `success save current task list ${status.running}/${status.total}/${status.sub}`
      }
    } else {
      return {
        rescode: -1,
        message: 'fail to save current task list'
      }
    }
  }
}

const taskInit = function() {
  // 初始化任务列表
  const tlist = list.get('task.list')
  if (tlist) {
    Object.assign(TASKS_INFO, tlist)
  }

  if (Object.keys(TASKS_INFO).length) {
    clog.info('retrieve task from task.list')
  }
  for(let tid in TASKS_INFO) {
    switch (TASKS_INFO[tid].type ) {
    case 'cron':
    case 'schedule':
      if (TASKS_INFO[tid].running) {
        TASKS_WORKER[tid] = new Task(TASKS_INFO[tid])
        TASKS_WORKER[tid].start()
      }
      TASKS_INFO[tid].id = tid
      break
    case 'sub':
      taskMan.startsub(tid)
      break
    }
  }
}();

module.exports = {
  taskMa: new Proxy(taskMan, {
    set(target, prop){
      clog.error('forbid redefine $task method', prop)
      throw new Error('forbid redefine $task method ' + prop)
    }
  })
}