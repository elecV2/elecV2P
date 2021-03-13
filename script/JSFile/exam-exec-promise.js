// 多语言数据处理。 Handle data by multiple language(shell/pyhton/javascript)

function execP(command, env={}) {
  return new Promise((resolve, reject)=>{
    $exec(command, {
      cwd: './script/Shell', env, call: true,
      cb(data, error, finish){
        if (finish) {
          console.log(command, 'finished.')
          resolve(data)
        }
        error ? reject(error) : console.log(data)
      }
    })
  })
}

const data = 'hello'

new Promise((resolve, reject)=>{
  execP('sh data.sh', { data }).then(res=>{
    console.log('shell result:', res)
    execP(`python data.py ${ encodeURI(res) }`).then(res=>{
      console.log('python result:', res)
      resolve(res)
      $done(res)
    }).catch(e=>reject(e))
  }).catch(e=>{
    reject(e)
  })
})