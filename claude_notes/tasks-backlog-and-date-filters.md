# Tasks: due date default hari ini, backlog, dan filter tanggal

## Apa yang berubah

Tiga hal di `src/components/tasks/TasksView.vue`:

1. **Due date default hari ini.** Field Due Date sekarang terisi tanggal hari ini saat halaman dibuka, dan kembali ke hari ini lagi setelah task ditambahkan. Sebelumnya kosong.
2. **Backlog** — task tanpa tanggal. Ada tombol toggle 📥 Backlog di sebelah date input; kalau aktif, date input di-disable dan task disimpan dengan `due: ''`.
3. **Filter baru**: ☀️ Today, 📅 By Date (dengan date picker), 📥 Backlog — melengkapi All / Active / Done yang sudah ada.

## Kenapa backlog perlu tombol eksplisit

Ini konsekuensi langsung dari perubahan #1. Begitu due date default hari ini, tidak ada lagi cara "alami" untuk bikin task tanpa tanggal — user harus mengosongkan date input secara manual, dan input `type="date"` itu merepotkan buat dikosongkan (harus pilih teksnya lalu hapus).

Jadi backlog bukan fitur terpisah yang kebetulan ditambah bareng: dia adalah **jalan keluar** yang menggantikan perilaku lama (biarkan tanggal kosong). Tombolnya bikin niatnya jelas — "task ini memang belum dijadwalkan", bukan "aku lupa isi tanggal".

Task lama yang sudah ada di database dengan `due: ''` otomatis muncul sebagai backlog. Tidak ada migrasi data: backlog **bukan** field baru, cuma tafsiran atas `due` yang kosong.

## Semantik filter

```js
today:   x.due === today()
date:    x.due === fDate.value
backlog: !x.due
```

Perhatikan ketiganya **tidak menyaring `done`** — task yang sudah selesai tetap muncul (dengan coretan). Ini disengaja: kalau task hari ini langsung hilang dari filter Today begitu dicentang, tab-nya jadi kosong justru di saat kamu paling produktif. Melihat yang sudah dicoret itu bagian dari rasa "hari ini beres".

Sebaliknya, **angka hitungan di tab** justru mengecualikan yang selesai:

```js
const todayCount = computed(() => DB.tasks.filter(x => x.due === today() && !x.done).length)
```

Alasannya beda konteks: badge angka itu jawaban dari "berapa yang masih harus dikerjakan", jadi task selesai tidak boleh ikut dihitung — kalau ikut, angkanya tidak pernah turun dan jadi tidak berguna. Angkanya juga disembunyikan kalau nol (`todayCount ? ...  : ''`), supaya tab bersih waktu sudah kelar semua.

## Filter "By Date"

Date picker-nya baru muncul kalau tab By Date aktif (`v-if`), jadi tidak makan tempat waktu tidak dipakai. Ada tombol pintas "Today" buat balik ke hari ini. Nilai awalnya juga hari ini, jadi tab-nya langsung berguna tanpa perlu pilih apa-apa dulu.

Filter tanggal ini sengaja dibiarkan cocok-persis (`===`), bukan rentang. Untuk kebutuhan "apa yang jatuh tempo di tanggal X", itu sudah cukup — rentang tanggal baru masuk akal kalau nanti ada tampilan kalender/minggu.
