const { promisify } = require('util');
const { exec: realExec } = require('child_process');

// 测试真实的 child_process.exec
const promisifiedRealExec = promisify(realExec);

// 模拟 child_process.exec 的行为
const mockExec = function(command, options, callback) {
  const actualCallback = typeof options === 'function' ? options : callback;
  
  if (actualCallback) {
    // 模拟成功的回调 - 这是 child_process.exec 的真实签名
    setTimeout(() => {
      actualCallback(null, 'test stdout', 'test stderr');
    }, 0);
  }
};

// 测试 promisify 的行为
const promisifiedExec = promisify(mockExec);

async function test() {
  console.log('Testing real exec:');
  try {
    const result = await promisifiedRealExec('echo "hello"');
    console.log('Real exec result:', result);
    console.log('Type of result:', typeof result);
    console.log('Result.stdout:', result.stdout);
    console.log('Result.stderr:', result.stderr);
  } catch (error) {
    console.error('Real exec error:', error);
  }

  console.log('\nTesting mock exec:');
  try {
    const result = await promisifiedExec('test command');
    console.log('Mock exec result:', result);
    console.log('Type of result:', typeof result);
    console.log('Result.stdout:', result.stdout);
  } catch (error) {
    console.error('Mock exec error:', error);
  }
}

test();