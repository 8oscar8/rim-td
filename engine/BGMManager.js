/**
 * BGMManager.js
 * 게임의 배경음악을 순차적/무작위로 관리합니다.
 */
export class BGMManager {
    constructor() {
        this.basePath = 'assets/audio/backgrond/'; // 실제 폴더명 반영
        this.currentAudio = null;
        this.volume = 0.5;
        this.isFinalPhase = false;
        
        // 1. 시작 곡 및 최종 곡 정의
        this.startSong = '게임스타트.ogg';
        this.finalSong = 'Waiting For The Sun (Rimworld OST).ogg';
        
        // 2. 랜덤 풀 (셔플 대상)
        this.playList = [
            'Alpaca (Rimworld OST).ogg',
            'Ceta (Rimworld OST).ogg',
            'Chaos Bringer (Rimworld OST).ogg',
            'Entry Screen (Rimworld OST).ogg',
            'I Like It Here (Rimworld OST).ogg',
            'Ice Shaman (Rimworld OST).ogg',
            'Rimworld Anomaly OST #1 A Twisted Path - Alistair Lindsay.ogg',
            'Tribal Assembly (Rimworld OST).ogg'
        ];
        
        this.shuffledQueue = [];
    }

    /**
     * BGM 시스템 초기화 및 시작
     */
    init(initialVolume) {
        this.volume = initialVolume;
        this.shufflePlaylist();
        this.playNext(this.startSong); // 처음에 무조건 게임스타트 재생
    }

    /**
     * 재생 목록 셔플
     */
    shufflePlaylist() {
        this.shuffledQueue = [...this.playList].sort(() => Math.random() - 0.5);
    }

    /**
     * 다음 곡 재생 로직
     */
    playNext(specificSong = null) {
        // 기존 음악 중지
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        let nextSong = specificSong;
        
        // 특정 곡 지정이 없으면 큐에서 꺼냄
        if (!nextSong) {
            if (this.shuffledQueue.length === 0) {
                this.shufflePlaylist(); // 큐 소진 시 다시 셔플
            }
            nextSong = this.shuffledQueue.shift();
        }

        console.log(`[BGM] Now Playing: ${nextSong}`);
        
        this.currentAudio = new Audio(this.basePath + nextSong);
        this.currentAudio.volume = this.volume;
        
        // 곡이 끝나면 다음 곡 재생 (최종장 중이 아니라면)
        this.currentAudio.onended = () => {
            if (!this.isFinalPhase) {
                this.playNext();
            } else {
                // 98라운드 이후 전용 곡은 무한 반복
                this.playNext(this.finalSong);
            }
        };

        this.currentAudio.play().catch(e => console.warn("[BGM] Play failed (User interaction needed):", e));
    }

    /**
     * 웨이브 변화 시 최종장(98+) 체크
     */
    checkWave(waveNumber) {
        if (waveNumber >= 98 && !this.isFinalPhase) {
            console.log("[BGM] Final Phase Triggered! Switching to boss BGM.");
            this.isFinalPhase = true;
            this.playNext(this.finalSong);
        }
    }

    /**
     * 실시간 볼륨 조절 (설정창 연동용)
     */
    setVolume(vol) {
        this.volume = vol;
        if (this.currentAudio) {
            this.currentAudio.volume = vol;
        }
    }

    /**
     * 일시정지/재개 (필요 시)
     */
    pause() { if (this.currentAudio) this.currentAudio.pause(); }
    resume() { if (this.currentAudio) this.currentAudio.play().catch(()=>{}); }
}

// 싱글톤 인스턴스로 수출
export const bgmManager = new BGMManager();
