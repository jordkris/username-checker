// define
let t=$('#accountData').DataTable();

// all function
let setCache=(key, value) => {
  localStorage.setItem(key, value);
}
let getCache=(key) => localStorage.getItem(key);
let removeCache=(key, value) => {
  localStorage.removeItem(key, value);
}
let showToast=(message, color) => {
  $('.toast-body').addClass(`text-${color}`).text(message);
  $('.toast').toast({ delay: 5000 }).toast('show');
  $('.toast').on('hidden.bs.toast', () => {
    $('.toast-body').removeClass(`text-${color}`);
  });
}

let getAllPossibleAlpha=(minLetters, maxLetters) => {
  if (minLetters<1||maxLetters<minLetters) {
    throw new Error('Invalid minLetters / maxLetters');
  }

  const possibleLetter='._0123456789abcdefghijklmnopqrstuvwxyz';
  const base=possibleLetter.length;
  const result=[];

  for (let length=minLetters; length<=maxLetters; length++) {
    const max=Math.pow(base, length);

    for (let i=0; i<max; i++) {
      let n=i;
      let str='';

      while (n>0) {
        str=possibleLetter[n%base]+str;
        n=Math.floor(n/base);
      }
      str=str.padStart(length, possibleLetter[0]);
      result.push(str);
    }
  }

  return result;
}

let checkUsernames=(options) => new Promise(async (resolve, reject) => {
  if (options.generationType=='alpha') {

    let allAlpha=getAllPossibleAlpha(3, options.maxLetters);
    let tasks=[];
    for (let i=0; i<allAlpha.length; i++) {
      // tasks.push(checkUsername(allAlpha[i]));
      tasks.push(new Promise((resolve1, reject1) => {
        $.ajax({
          url: 'https://globalapi.netlify.app/api/usernameChecker/instagram',
          type: 'POST',
          data: JSON.stringify({
            username: allAlpha[i]
          }),
          success: (res) => {
            resolve1({
              accountStatus: res.success,
              httpStatus: res.status
            });
          },
          error: (err) => {
            reject1(err);
          }
        });
      }));
      if ((i+1)%options.numThreads==0) {
        await Promise.all(tasks).then((val) => {
          tasks=[];
          console.log(val);
          t.row.add([
            i+1,
            allAlpha[i],
            val.success? 'Availabble':'Not Available',
            val.httpStatus
          ]);
        });
      }
      if (options.signal.aborted) {
        return reject(new DOMException("Aborted", "AbortError"));
      }
      if (getCache('process')=='stop') {
        break;
      }
    }
  }
  options.signal.addEventListener("abort", () => {
    reject(new DOMException("Aborted", "AbortError"));
  });
});


// implementation
$(document).ready(() => {
  const keys=['maxLetters', 'numThreads'];
  keys.forEach((key, i) => {
    const $input=$(`input[name="${key}"]`);
    const cachedValue=getCache(key);
    if (cachedValue!==null&&cachedValue!==undefined) {
      $input.val(cachedValue);
    }
    $input.on('change', function () {
      setCache(key, $input.val());
    });
  });
  const $gtInput=$(`select[name="generationType"]`);
  const gtValue=getCache('generationType');
  if (gtValue!==null&&gtValue!==undefined) {
    $gtInput.val(gtValue);
  }
  $gtInput.on('change', () => {
    setCache('generationType', $gtInput.val());
  });

  $('#actionButton').click(() => {
    let controller=new AbortController();
    let maxLetters=$('input[name="maxLetters"]').val();
    let numThreads=$('input[name="numThreads"]').val();
    let generationType=$('select[name="generationType"]').val();
    let cookie=$('input[name="cookie"]').val();

    if ($('#actionButton').data('state')=='stop') {
      $('#actionButton').data('state', 'start');
      $('#actionButton').removeClass('btn-success').addClass('btn-danger');
      $('#actionButton').html('<i class="fas fa-stop"></i> Stop');
      showToast('Starting process...', 'primary');
      setCache('process', 'continue');
      checkUsernames({
        signal: controller.signal,
        generationType: generationType,
        maxLetters: maxLetters,
        numThreads: numThreads
      })
        .then(console.log)
        .catch(e => console.log(e.message));
    } else {
      $('#actionButton').data('state', 'stop');
      $('#actionButton').removeClass('btn-danger').addClass('btn-success');
      $('#actionButton').html('<i class="fas fa-play"></i> Start');
      showToast('Stopping process...', 'danger');
      controller.abort();
      setCache('process', 'stop');
    }

  });


});