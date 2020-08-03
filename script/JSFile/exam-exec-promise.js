// 多语言数据处理。 Handle data by multiple language(shell/pyhton/javascript)

function execP(command, env={}) {
  return new Promise((resolve, reject)=>{
    $exec(command, {
      cwd: './script/Shell', env,
      cb(data, error){
        error ? reject(error) : resolve(data)
      }
    })
  })
}

const data = 'hello'

$result = new Promise((resolve, reject)=>{
  execP('sh data.sh', { data }).then(res=>{
    console.log('shell result:', res)
    execP(`python data.py ${ encodeURI(res) }`).then(res=>{
      console.log('python result:', res)
      resolve(res)
    }).catch(e=>reject(e))
  }).catch(e=>{
    reject(e)
  })
})