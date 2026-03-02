const API_URL = https://script.google.com/macros/s/AKfycbzqTAelw09cG0cdDrzt_5VnAQWyd5j09eO6cLrvY9CvgFbTia20t5rmg04kubt3h2s-/exec;

let produkData = [];
let siswaData = [];
let items = [];

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  addItem();
});

async function loadData() {
  const produkRes = await fetch(API_URL + "?action=getProduk");
  produkData = await produkRes.json();

  const siswaRes = await fetch(API_URL + "?action=getSiswa");
  siswaData = await siswaRes.json();

  populateNamaDropdown();
}

function populateNamaDropdown() {
  const select = document.getElementById("namaSelect");
  select.innerHTML = "";

  const siswaNames = siswaData.map(s => s.nama);

  const optionBaru = document.createElement("option");
  optionBaru.value = "baru";
  optionBaru.text = "Siswa Baru";
  select.appendChild(optionBaru);

  siswaNames.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.text = name;
    select.appendChild(opt);
  });

  select.addEventListener("change", handleNamaChange);
}

function handleNamaChange(e) {
  const val = e.target.value;
  const container = document.getElementById("newStudentContainer");

  if (val === "baru") {
    container.style.display = "block";
  } else {
    container.style.display = "none";

    const siswa = siswaData.find(s => s.nama === val);
    if (siswa) {
      document.getElementById("kelasInput").value = siswa.kelas;
    }
  }
}

function addItem() {
  const container = document.getElementById("itemsContainer");

  const itemIndex = items.length;
  items.push({});

  const div = document.createElement("div");
  div.className = "item";
  div.innerHTML = `
    <hr>
    <label>Nama Barang</label>
    <select class="barang"></select>

    <label>Size</label>
    <select class="size"></select>

    <label>Harga</label>
    <input type="text" class="harga" readonly>

    <label>Qty</label>
    <input type="number" class="qty" value="1" min="1">
  `;

  container.appendChild(div);

  const barangSelect = div.querySelector(".barang");
  const sizeSelect = div.querySelector(".size");
  const hargaInput = div.querySelector(".harga");

  populateBarang(barangSelect);

  barangSelect.addEventListener("change", () => {
    populateSize(barangSelect.value, sizeSelect);
  });

  sizeSelect.addEventListener("change", () => {
    const harga = getHarga(barangSelect.value, sizeSelect.value);
    hargaInput.value = harga;
  });

  document.getElementById("itemsContainer").appendChild(div);
}

function populateBarang(select) {
  const uniqueBarang = [...new Set(produkData.map(p => p.nama))];
  uniqueBarang.forEach(nama => {
    const opt = document.createElement("option");
    opt.value = nama;
    opt.text = nama;
    select.appendChild(opt);
  });
}

function populateSize(barang, sizeSelect) {
  sizeSelect.innerHTML = "";
  const sizes = produkData.filter(p => p.nama === barang).map(p => p.size);
  sizes.forEach(size => {
    const opt = document.createElement("option");
    opt.value = size;
    opt.text = size;
    sizeSelect.appendChild(opt);
  });
}

function getHarga(barang, size) {
  const item = produkData.find(p => p.nama === barang && p.size === size);
  return item ? item.harga : 0;
}

async function submitOrder(e) {
  try {
    const payload = JSON.parse(e.postData ? e.postData.contents : '{}');
    const sheet = getSheet("Order");

    const timestamp = new Date();
    const invoice = generateInvoice(sheet);

    if (!payload.items || !Array.isArray(payload.items)) {
      return jsonResponse({ status: "error", message: "Invalid items" });
    }

    payload.items.forEach(item => {
      const total = item.qty * item.harga;

      sheet.appendRow([
        timestamp,
        invoice,
        payload.nama,
        payload.kelas,
        item.barang,
        item.size,
        item.qty,
        item.harga,
        total
      ]);
    });

    return jsonResponse({ status: "success", invoice: invoice });
  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function showSummary(payload, invoice) {
  document.getElementById("page1").style.display = "none";
  document.getElementById("page2").style.display = "block";

  const summary = document.getElementById("summary");
  summary.innerHTML = `<h3>No Invoice: ${invoice}</h3>`;

  payload.items.forEach(item => {
    const total = item.qty * item.harga;
    summary.innerHTML += `
      <p>
        ${item.barang}<br>
        ${item.qty} x ${item.harga} = ${total}
      </p>
    `;
  });
}

function downloadSummary() {
  html2canvas(document.getElementById("page2")).then(canvas => {
    const link = document.createElement("a");
    link.download = "rekap.jpg";
    link.href = canvas.toDataURL("image/jpeg");
    link.click();
  });
}

function resetForm() {
  location.reload();
}

function exitWeb() {
  window.close();
}
