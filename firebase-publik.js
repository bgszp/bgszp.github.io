import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Konfigurasi Firebase Anda
const firebaseConfig = {
    apiKey: "AIzaSyBYx-nRn5tusVMNSkze4tp-pwbjEyg-y5Y",
    authDomain: "data-publik.firebaseapp.com",
    databaseURL: "https://data-publik-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "data-publik",
    storageBucket: "data-publik.firebasestorage.app",
    messagingSenderId: "376849069775",
    appId: "1:376849069775:web:1cf9c6857f71935ed0e9ba"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// === 1. LOGIKA CATATAN PUBLIK ===
window.tambahCatatanPublik = function() {
    const input = document.getElementById("inputCatatanPublik");
    const teks = input.value.trim();
    if(!teks) return;

    const dbRef = ref(db, 'catatan_publik');
    push(dbRef, {
        pesan: teks,
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('id-ID')
    }).then(() => {
        input.value = "";
        if(window.showToast) window.showToast("Catatan Publik Terkirim! 🚀");
    });
};

window.hapusCatatanPublik = function(id) {
    const dbRef = ref(db, 'catatan_publik/' + id);
    remove(dbRef).then(() => {
        if(window.showToast) window.showToast("Catatan dihapus! 🗑️");
    });
};

const dbRefPublik = ref(db, 'catatan_publik');
onValue(dbRefPublik, (snapshot) => {
    const wadah = document.getElementById("wadahCatatanPublikList");
    if (!wadah) return; 
    
    wadah.innerHTML = "";
    const data = snapshot.val();
    
    if (!data) {
        wadah.innerHTML = '<div style="color:#6e678a; font-size:12px; text-align:center; margin-top:20px;">Belum ada catatan publik. Jadilah yang pertama menulis!</div>';
        return;
    }

    let copiedKeys = JSON.parse(localStorage.getItem('copied_publik_keys') || '[]');
    const reversedKeys = Object.keys(data).reverse();

    reversedKeys.forEach((key, index) => {
        const item = data[key];
        const row = document.createElement("div");
        row.className = "row-copas-alarm";
        
        if (!copiedKeys.includes(key)) {
            row.classList.add("publik-nyala");
        }
        
        row.innerHTML = `
            <div style="font-size:12px; color:#00ffcc; width:20px; font-weight:bold; margin-top: 5px;">${index + 1}.</div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px; z-index: 2;">
                <div class="teks-publik" style="font-size: 13px; color: #fff; word-break: break-all; white-space: pre-wrap; cursor: pointer;" title="Klik untuk menyalin">${item.pesan} <i class="fa-regular fa-copy copy-hint-icon" style="color: #00ffcc; opacity: 1; margin-left: 5px;"></i></div>
                <div style="font-size: 10px; color: #8e85b3;"><i class="fa-regular fa-clock"></i> ${item.waktu || ''}</div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: -2px;">
                <button class="btn-edit-publik btn-hapus-copas" style="color: #f0ad4e; font-size: 14px;" title="Edit"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-hapus-publik btn-hapus-copas" style="font-size: 14px; color: #ff4a4a;" title="Hapus"><i class="fa-solid fa-trash"></i></button>
            </div>
        `;
        
        row.querySelector('.teks-publik').addEventListener('click', () => {
            if(window.eksekusiSalinTeks) {
                window.eksekusiSalinTeks(item.pesan).then(() => {
                    if(window.showToast) window.showToast("Catatan Publik Disalin! ✨");
                    row.classList.remove("publik-nyala");
                    let currentKeys = JSON.parse(localStorage.getItem('copied_publik_keys') || '[]');
                    if (!currentKeys.includes(key)) {
                        currentKeys.push(key);
                        localStorage.setItem('copied_publik_keys', JSON.stringify(currentKeys));
                    }
                });
            }
        });
        
        row.querySelector('.btn-edit-publik').addEventListener('click', () => {
            const pesanBaru = prompt("Edit catatan publik:", item.pesan);
            if (pesanBaru !== null && pesanBaru.trim() !== "" && pesanBaru !== item.pesan) {
                const catatanRef = ref(db, 'catatan_publik/' + key);
                update(catatanRef, {
                    pesan: pesanBaru.trim(),
                    waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('id-ID') + ' (Diedit)'
                }).then(() => {
                    if(window.showToast) window.showToast("Catatan diedit! ✏️");
                });
            }
        });
        
        row.querySelector('.btn-hapus-publik').addEventListener('click', () => {
            window.hapusCatatanPublik(key);
        });

        wadah.appendChild(row);
    });
});

// === 2. LOGIKA CATATAN UTAMA (LIVE REALTIME) ===
const refCatatanUtama = ref(db, 'catatan_utama_live');
onValue(refCatatanUtama, (snapshot) => {
    const data = snapshot.val();
    const teks = data ? data.content : "";
    
    // Lempar data ke fungsi di index.html jika ada
    if (window.renderNotesListDariFirebase) {
        window.renderNotesListDariFirebase(teks);
    }
});

window.simpanCatatanUtamaKeFirebase = function(teksUtama) {
    set(refCatatanUtama, { content: teksUtama }).then(() => {
        if(window.showToast) window.showToast("Catatan Tersimpan secara Global! ☁️");
    }).catch(err => {
        alert("Gagal menyimpan ke Cloud: " + err.message);
    });
};


// === 3. LOGIKA RIWAYAT GENERATOR & COOLDOWN 24 JAM (GLOBAL) ===
window.DATA_TERPAKAI_FIREBASE = {};

const refRiwayat = ref(db, 'riwayat_generator');
onValue(refRiwayat, (snapshot) => {
    const list = document.getElementById('historyList');
    if (!list) return;
    
    // Kosongkan riwayat lokal setiap ada update dari Firebase
    list.innerHTML = "";
    window.DATA_TERPAKAI_FIREBASE = {};

    const data = snapshot.val();
    if (!data) return;

    const sekarang = Date.now();
    const WAKTU_COOLDOWN = 24 * 60 * 60 * 1000; // Batas 24 Jam
    
    // Membalik urutan agar yang terbaru muncul di atas
    const keys = Object.keys(data).reverse();

    keys.forEach(key => {
        const item = data[key];
        
        // Filter: Hanya tampilkan dan kunci data yang usianya di bawah 24 jam
        if (sekarang - item.waktu < WAKTU_COOLDOWN) {
            
            // Kunci No HP ini agar masuk daftar hitam sementara
            if(item.no_hp) {
                window.DATA_TERPAKAI_FIREBASE[item.no_hp] = true;
            }

            // Render teks ke dalam kotak riwayat HTML
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerText = item.teks;
            div.onclick = function() {
                document.getElementById('genNameOutput').value = item.teks;
                if(window.eksekusiSalinTeks) {
                    window.eksekusiSalinTeks(item.teks).then(() => {
                        if(window.showToast) window.showToast("Disalin dari Riwayat! ✨");
                    });
                }
            };
            list.appendChild(div);
        }
    });
});

// Fungsi melempar data baru ke Firebase
window.tambahKeRiwayatFirebase = function(teks, no_hp) {
    push(ref(db, 'riwayat_generator'), {
        teks: teks,
        no_hp: no_hp || null,
        waktu: Date.now()
    });
};

// Fungsi menghapus semua riwayat sekaligus mereset blokir 24 jam di semua perangkat
window.hapusRiwayatFirebase = function() {
    remove(ref(db, 'riwayat_generator')).then(() => {
        if(window.showToast) window.showToast("Riwayat & Batas 24 Jam Global Direset! 🔄");
    });
};
