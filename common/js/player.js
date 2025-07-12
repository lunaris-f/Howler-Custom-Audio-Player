var elms = [
  'track',
  'timer',
  'duration',
  'playBtn',
  'pauseBtn',
  'prevBtn',
  'nextBtn',
  'volumeBtn',
  'progress',
  'bar',
  'loading',
  'playLists',
  'playlist',
  'volume',
  'volumeNum',
  'barEmpty',
  'barFull',
  'sliderBtn',
  'seekBtn',
  'progress',
  'progressWrap',
  'progressBar',
  'playOrderBtn',
  'waveArea',
  'waveUp',
  'waveDown',
];
elms.forEach(function(elm) {
  window[elm] = document.getElementById(elm);
});

//音楽リスト
var myMusicList = [
  './audio/rave_digger.mp3',
  './audio/80s_vibe.mp3',
  './audio/running_out.mp3'
];

// 再生モード( nomal、random、loop )
let playMode = 'nomal';
//再生Index( 1曲目は0番 )
var songIndex = 0;
//ボリューム設定( 0~1、0.5で50% )
var songPer = 1;


//getパラメータからプレイヤー設定を取得
let params = new URLSearchParams(document.location.search);

if( params ){
  //パラメーターから再生モード取得
  if( params.get('mode') ){
    if( params.get('mode')  == 'nomal' ){
      playMode = 'nomal';
    }else if ( params.get('mode')  == 'random' ){
      playMode = 'random';
    }else if ( params.get('mode')  == 'loop' ){
      playMode = 'loop';
    }
  }
  //パラメーターから最初に再生する曲を取得
  if( params.get('index') && Number.isInteger ( Number( params.get('index') ) ) ){
    songIndex = Number( params.get('index') );
  }else if( playMode == 'random' ){
    songIndex = Math.floor(Math.random() * myMusicList.length);
  }
  //パラメーターからボリュームを取得
  if( !isNaN( parseFloat( params.get('per') ) ) ){
    songPer = parseFloat( params.get('per') );
  }
}
if( songPer > 1 ){
  songPer = 1;
}else if( songPer < 0 ) {
  songPer = 1;
}


var playListElements = [];
var analyser = null;
var Player = function(playlist) {
  var self = this;
  var i = 0;
  this.playlist = playlist;
  this.index = songIndex;
  this.randomIndex = 0;
  this.playlistIndexes = [];
  this.randomPlaylist = [];
  this.songWaves = [];
  this.playOrder = 'normal';

  track.innerHTML = playlist[songIndex].title;
  playlist.forEach(function(song) {
    var li = document.createElement('li');
    var p = document.createElement('p');
    var playListCont = document.createElement('div');
    playListCont.classList.add('playListCont');
    p.classList.add('playListContR');
    li.classList.add('playListItem');
    li.id = 'list-item-' + i;
    p.innerHTML = song.title;
    playListCont.appendChild(p);
    li.appendChild(playListCont);
    li.onclick = function() {
      if( li.classList.contains('active') ){
        scrollList(playlist.indexOf(song));
      }else{
        player.skipTo(playlist.indexOf(song));
      }
    };
    playListElements.push(li);
    playLists.appendChild(li);

    self.playlistIndexes.push(playlist.indexOf(song));
    self.songWaves.push(null);
    i++;
  });
  
  activeList(0, songIndex);
};
Player.prototype = {
  play: function(index) {
    var self = this;
    var sound;

    index = typeof index === 'number' ? index : self.index;
    var data = self.playlist[index];

    if (data.howl) {
      sound = data.howl;
    } else {
      sound = data.howl = new Howl({
        src: [data.file],
        html5: true,
        onplay: function() {
          duration.innerHTML = self.formatTime(Math.round(sound.duration()));
          requestAnimationFrame(self.step.bind(self));
          bar.style.display = 'none';
          pauseBtn.style.display = 'block';
          
          analyser = Howler.ctx.createAnalyser();
          if( self.songWaves[index] === null ){
            self.songWaves[index] = Howler.ctx.createMediaElementSource(sound._sounds[0]._node);
            self.songWaves[index].connect(analyser);
            analyser.connect(Howler.ctx.destination);
          }else{
            self.songWaves[index].connect(analyser);
          }

          // 周波数データを取得
          dataArray = new Uint8Array(analyser.frequencyBinCount);
          animateWave();
        },
        onload: function() {
          bar.style.display = 'none';
          loading.style.display = 'none';
        },
        onend: function() {
          bar.style.display = 'block';
          if( self.playOrder === 'loop' ){
            self.skip('loop');
          }else{
            self.skip('next');
          }
        },
        onpause: function() {
          bar.style.display = 'block';
        },
        onstop: function() {
          bar.style.display = 'block';
        },
        onseek: function() {
          requestAnimationFrame(self.step.bind(self));
        },
        onloaderror: function() {
          data.title = data.title + '\n(ファイルが存在しません)';
          track.innerText = data.title;
          data.file = null;
          loading.style.display = 'none';
          toggleEnabled = false;
        }
      });
    }


    sound.play();
    track.innerHTML = data.title;

    if ( sound.state() === 'loaded') {
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'block';
    } else {
        loading.style.display = 'block';
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
    }
    if( sound.state() !== 'loaded' && self.playOrder === 'loop' ){
      loading.style.display = 'none';
    }else if( data.file === null ){
      loading.style.display = 'none';
      toggleEnabled = false;
    }
    
    self.index = index;
  },

  pause: function() {
    var self = this;
    var sound = self.playlist[self.index].howl;
    sound.pause();
    playBtn.style.display = 'block';
    pauseBtn.style.display = 'none';
  },

  skip: function(direction) {
    var self = this;
    var index = 0;
    
    if( self.playOrder === 'random' ){
      if (direction === 'prev') {
        self.randomIndex = self.randomIndex - 1;
        if (self.randomIndex < 0) {
          self.randomIndex = self.playlist.length - 1;
        }
      } else {
        self.randomIndex = self.randomIndex + 1;
        if (self.randomIndex >= self.playlist.length) {
          self.randomIndex = 0;
        }
      }
      self.skipTo(self.randomPlaylist[self.randomIndex]);
    }else{
      if (direction === 'prev') {
        index = self.index - 1;
        if (index < 0) {
          index = self.playlist.length - 1;
        }
      } else if( direction === 'next' ){
        index = self.index + 1;
        if (index >= self.playlist.length) {
          index = 0;
        }
      }else{
        index = self.index;
      }
      self.skipTo(index);
    }
  },

  skipTo: function(index) {
    var self = this;

    if (self.playlist[self.index].howl) {
      self.playlist[self.index].howl.stop();
    }
    progress.style.width = '0%';
    if( self.index ){
      activeList(self.index, index);
    }else{
      activeList(0, index);
    }
    self.play(index);
    songIndex = index;
  },

 
  volume: function(val) {
    var self = this;
    Howler.volume(val);
    var barWidth = (val * 90) / 100;
    barFull.style.width = (barWidth * 100) + '%';
    sliderBtn.style.left = (window.innerWidth * barWidth + window.innerWidth * 0.05 - 25) + 'px';
  },


  seek: function(per) {
    var self = this;
    var sound = self.playlist[self.index].howl;
    if (sound.playing()) {
      sound.seek(sound.duration() * per);
    }
  },

  step: function() {
    var self = this;
    var sound = self.playlist[self.index].howl;
    var seek = sound.seek() || 0;
    timer.innerHTML = self.formatTime(Math.round(seek));
    
    // 進捗バーの更新
    if( !dragging ){
      var duration = sound.duration() || 0;
      progress.style.width = (((seek / duration) * 100) || 0) + '%';
      seekBtn.style.left = (((seek / duration) * 100) || 0) + '%';
      if (sound.playing()) {
        requestAnimationFrame(self.step.bind(self));
      }
    }
  },

  toggleVolume: function() {
    var self = this;
    var display = (volume.style.display === 'block') ? 'none' : 'block';

    setTimeout(function() {
      volume.style.display = display;
    }, (display === 'block') ? 0 : 500);
    volume.className = (display === 'block') ? 'fadein' : 'fadeout';
  },

  formatTime: function(secs) {
    var minutes = Math.floor(secs / 60) || 0;
    var seconds = (secs - minutes * 60) || 0;

    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  },
  changePlayOrder: function( order ) {
    var self = this;
    if( order ){
      self.playOrder = order;
    }else{
      if( self.playOrder === 'normal' ){
        self.playOrder = 'random';
      }else if( self.playOrder === 'random' ){
        self.playOrder = 'loop';
      }else{
        self.playOrder = 'normal';
      }
    }
    if( self.playOrder === 'random' ){
      self.randomPlaylist = shufflePlaylist(self.playlistIndexes);
      if( self.randomPlaylist.indexOf(songIndex) ){
        self.randomIndex = self.randomPlaylist.indexOf(songIndex);
      }
    }
    changePlayOrderBtnClass(self.playOrder);
  },
};

let musicData = [];
for (let i = 0; i < myMusicList.length; i++) {
  const title = myMusicList[i].substring(myMusicList[i].lastIndexOf('/') + 1);
  musicData.push({
    title: removeAudioExtension(title),
    file: myMusicList[i],
    howl: null
  });
}

if( songIndex >= musicData.length ){
  songIndex = 0;
}

var player = new Player(musicData);
setVolume( songPer );

playBtn.addEventListener('click', function() {
  player.play(songIndex);
});
pauseBtn.addEventListener('click', function() {
  player.pause();
});
playOrderBtn.addEventListener('click', function() {
  player.changePlayOrder();
});
prevBtn.addEventListener('click', function() {
  player.skip('prev');
});
nextBtn.addEventListener('click', function() {
  player.skip('next');
});
volumeBtn.addEventListener('click', function() {
  player.toggleVolume();
});
volume.addEventListener('click', function() {
  player.toggleVolume();
});
barEmpty.addEventListener('click', function(event) {
  var per = event.layerX / parseFloat(barEmpty.scrollWidth);
  player.volume(per);
});
sliderBtn.addEventListener('mousedown', function() {
  window.sliderDown = true;
});
sliderBtn.addEventListener('touchstart', function() {
  window.sliderDown = true;
});
volume.addEventListener('mouseup', function() {
  window.sliderDown = false;
});
volume.addEventListener('touchend', function() {
  window.sliderDown = false;
});

// 音楽の拡張子を削除
function removeAudioExtension(fileName) {
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma', '.aiff'];
  for (const ext of audioExtensions) {
      if (fileName.endsWith(ext)) {
          return fileName.slice(0, -ext.length);
      }
  }
  return fileName;
}

//再生リストのアクティブ化
function activeList(oldIndex, newIndex) {
  playListElements[oldIndex].classList.remove('active');
  playListElements[newIndex].classList.add('active');
  scrollList(newIndex);
}

//リストまでスクロール
function scrollList(index) {
  // 親要素がスクロール可能か確認
  const isScrollable = playLists.scrollHeight > playLists.clientHeight;

  if (isScrollable) {
      const itemPosition = playListElements[index].offsetTop;
      const playListTitleHeight = playListTitle.offsetHeight;

      playLists.scrollTo({
          top: itemPosition - playListTitleHeight,
          behavior: 'smooth'
      });
  }
}

var move = function(event) {
  if (window.sliderDown) {
    var x = event.clientX || event.touches[0].clientX;
    var startX = window.innerWidth * 0.05;
    var layerX = x - startX;
    var per = Math.min(1, Math.max(0, layerX / parseFloat(barEmpty.scrollWidth)));
    player.volume(per);
  }
};

volume.addEventListener('mousemove', move);
volume.addEventListener('touchmove', move);

// ボリュームを変更
function setVolume(volume) {
  var per = Math.min(1, Math.max(0, volume));
  player.volume(per);
  const volumeNumber = document.getElementById('volumeNum');
  volumeNumber.innerHTML = Math.trunc(per * 100);
  barFull.style.width = (per * 90) + '%';
  const volumeBtnElement = document.getElementById('volumeBtn');
  if (per === 0) {
      volumeBtnElement.classList.add('mute');
  } else {
      volumeBtnElement.classList.remove('mute');
  }

  songPer = per;
}

// スライダーでボリュームを変更
var moveVolume = async function(event) {
    if (window.sliderDown) {
        var x = event.clientX || event.touches[0].clientX;
        var startX = window.innerWidth * 0.05;
        var layerX = x - startX;
        var per = Math.min(1, Math.max(0, layerX / parseFloat(barEmpty.scrollWidth)));

        player.volume(per);
        volumeNum.innerHTML = Math.trunc(per * 100);

        if (songPer !== per) {
            if (per === 0 || per === 1) {
                window.sliderDown = false;
                var event = new Event('mouseup');
                volume.dispatchEvent(event);
                player.toggleVolume();
            }
        }

        if (per === 0) {
            volumeBtn.classList.add('mute');
        } else {
            volumeBtn.classList.remove('mute');
        }
        songPer = per;
    }
};

volume.addEventListener('mousemove', moveVolume);
volume.addEventListener('touchmove', moveVolume);

// クリックで音量数値を変更
volume.addEventListener('click', function() {
  var barFullNum = 90;
  if( barFull.style.width ){
    barFullNum = parseInt(barFull.style.width);
  }
  var newNum = barFullNum / 90 * 100;
  volumeNum.innerHTML = Math.trunc(newNum);
  songPer = newNum / 100;
});

// 進捗バーをクリックしたときの処理
progressBar.addEventListener('click', function(event) {
  var per = event.offsetX / this.clientWidth;
  player.seek(per);
});

// スライダーをドラッグして再生位置を変更する
var dragging = false;

seekBtn.addEventListener('mousedown', function() {
  dragging = true;
});

var nowPer = 0;
progressWrap.addEventListener('mousemove', function(event) {
  if (dragging) {
      // スライダーの位置を計算
      var x = event.clientX - progressBar.getBoundingClientRect().left; 
      var per = Math.min(1, Math.max(0, x / progressBar.clientWidth));
      nowPer = per;
      progress.style.width = (per * 100) + '%'; // 進捗バーの幅を更新
      seekBtn.style.left = (per * 100) + '%'; // スライダーの位置を更新
  }
});

document.addEventListener('mouseup', function() {
  if( dragging ){
    dragging = false;
    player.seek(nowPer);
  }
});

//波形アニメーション
var animeStep = 0;
const barCount = 128; // 表示するバーの数
const bars = [];

function createBars(container, barArray) {
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.classList.add('waveBar');
        container.appendChild(bar);
        barArray.push(bar);
    }
}

// 上側と下側のバーを作成
createBars(waveUp, bars);
createBars(waveDown, []);

function animateWave() {
    requestAnimationFrame(animateWave);

    if( animeStep % 2 === 0 ){
      analyser.getByteFrequencyData(dataArray);
      for (let i = 0; i < barCount; i++) {
          const value = dataArray[i * Math.floor(dataArray.length / barCount)];
          const height = value;
          bars[i].style.height = `${height}px`;
          waveDown.children[i].style.height = `${height}px`;

      }
    }
    animeStep++;
}

//プレイモード変更
player.changePlayOrder( playMode );

//配列をシャッフル
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

//再生リストをシャッフル
function shufflePlaylist(array) {
  return shuffleArray(array);
}

//playOrderBtnのクラスを変更
function changePlayOrderBtnClass( order ){
  playOrderBtn.classList.remove('normal');
  playOrderBtn.classList.remove('random');
  playOrderBtn.classList.remove('loop');
  playOrderBtn.classList.add(order);
}

//リサイズ
var sliderBtnRadius = 25 ;
var resize = function() {
  if( barFull.offsetWidth ){
    sliderBtn.style.left = (barFull.offsetWidth + sliderBtnRadius) + 'px';
  }
  //再生リストの高さを変更
  var targetElement = document.getElementById('playLists');
  var playListTitleHeight = playListTitle.offsetHeight;
  var playListsHeight = window.innerHeight - playListTitleHeight - 30;
  targetElement.style.height = playListsHeight + 'px';
};
window.addEventListener('resize', resize);
resize();