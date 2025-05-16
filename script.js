// --- Глобальные переменные ---
let journal = [];
let editIndex = null;
const subjects = ["Информатика", "Физика", "Математика", "Литература", "Музыка"];
const requiredHeaders = ["ФИО", "Класс", ...subjects];
let chart; // для графика по предметам (все классы)
let classChart; // для графика по классам

// --- Переключение вкладок ---
function showTab(idx) {
    document.querySelectorAll('.tab-content').forEach((el, i) => el.style.display = i === idx ? '' : 'none');
    document.querySelectorAll('.tab').forEach((el, i) => el.classList.toggle('active', i === idx));
    if (idx === 1) renderJournal();
    if (idx === 2) renderStatTable();
    if (idx === 3) {
        renderStatChart();
        fillClassSelect();
    }
}

// --- Загрузка файла ---
function uploadFile() {
    const input = document.getElementById('fileInput');
    if (input.files.length === 0) {
        alert('Пожалуйста, выберите файл!');
        return;
    }
    const file = input.files[0];
    let ext = file.name.split('.').pop().toLowerCase();
    if (['csv', 'txt'].includes(ext)) {
        let reader = new FileReader();
        reader.onload = function (e) {
            let text = e.target.result;
            let rows = text.split(/\r?\n/).filter(Boolean).map(row => row.split(/[;,]/));
            processRows(rows);
        };
        reader.readAsText(file);
    } else if (ext === 'xlsx') {
        let reader = new FileReader();
        reader.onload = function (e) {
            let data = new Uint8Array(e.target.result);
            let workbook = XLSX.read(data, { type: 'array' });
            let sheet = workbook.Sheets[workbook.SheetNames[0]];
            let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            processRows(rows);
        };
        reader.readAsArrayBuffer(file);
    } else {
        alert('Поддерживаются только .csv, .txt, .xlsx');
    }
}

// --- Обработка строк файла ---
function processRows(rows) {
    if (rows.length === 0) {
        alert('Файл пустой');
        return;
    }
    const headers = rows[0].map(h => h.trim());
    const missing = requiredHeaders.filter(h => !headers.includes(h));
    if (missing.length > 0) {
        alert('В файле отсутствуют колонки: ' + missing.join(', '));
        return;
    }
    let idx = {};
    requiredHeaders.forEach(h => { idx[h] = headers.indexOf(h); });
    let loaded = [];
    for (let i = 1; i < rows.length; ++i) {
        let r = rows[i];
        if (r.length < headers.length) continue;
        let entry = {
            fio: r[idx["ФИО"]],
            class: r[idx["Класс"]],
        };
        subjects.forEach(s => entry[s] = parseInt(r[idx[s]]));
        loaded.push(entry);
    }
    journal = loaded;
    renderUploadTable();
    renderJournal();
    fillClassSelect();
    renderStatChart();
}

// --- Таблица загруженных данных ---
function renderUploadTable() {
    let html = '<table><tr><th>ФИО</th><th>Класс</th>';
    subjects.forEach(s => html += `<th>${s}</th>`);
    html += '</tr>';
    for (let row of journal)
        html += `<tr><td>${row.fio}</td><td>${row.class}</td>${subjects.map(s => `<td>${[2,3,4,5].includes(row[s]) ? row[s] : 0}</td>`).join('')}</tr>`;
    // Итоговая строка полностью удалена!
    html += '</table>';
    document.getElementById('uploadTable').innerHTML = html;
}

// --- Очистка таблицы ---
function clearTable() {
    journal = [];
    renderUploadTable();
    renderJournal();
}

// --- Добавление/редактирование записи ---
function addOrUpdate() {
    let fio = document.getElementById('fio').value.trim();
    let cls = document.getElementById('class').value.trim();
    let entry = { fio, class: cls };
    let valid = fio && cls;
    subjects.forEach(s => {
        let val = parseInt(document.getElementById(subjectToId(s)).value);
        entry[s] = val;
        if (isNaN(val) || val < 2 || val > 5) valid = false;
    });
    if (!valid) {
        alert('Проверьте правильность ввода!');
        return;
    }
    if (editIndex !== null) {
        journal[editIndex] = entry;
        editIndex = null;
        document.getElementById('editInfo').innerHTML = '';
    } else {
        journal.push(entry);
    }
    document.getElementById('fio').value = '';
    document.getElementById('class').value = '';
    subjects.forEach(s => document.getElementById(subjectToId(s)).value = '');
    renderJournal();
    renderUploadTable();
    fillClassSelect();
    renderStatChart();
}

function subjectToId(s) {
    return {
        "Информатика": "informatics",
        "Физика": "physics",
        "Математика": "math",
        "Литература": "literature",
        "Музыка": "music"
    }[s];
}

// --- Таблица журнала ---
function renderJournal() {
    let html = '<table><tr><th>ФИО</th><th>Класс</th>';
    subjects.forEach(s => html += `<th>${s}</th>`);
    html += '<th>Действия</th></tr>';
    journal.forEach((row, i) => {
        html += `<tr>
            <td>${row.fio}</td>
            <td>${row.class}</td>
            ${subjects.map(s => {
                const v = row[s];
                // Если значение невалидно, выводим 0
                return `<td>${[2,3,4,5].includes(v) ? v : 0}</td>`;
            }).join('')}
            <td class="actions">
                <button onclick="editRow(${i})">✎</button>
                <button class="delete-btn" onclick="deleteRow(${i})">🗑️</button>
            </td>
        </tr>`;
    });
    // Итоговая строка
    html += '<tr><td colspan="2"><b>Среднее</b></td>';
    subjects.forEach(s => {
        const values = journal.map(r => r[s]).filter(v => [2,3,4,5].includes(v));
        const avgValue = values.length ? avg(values).toFixed(2) : '0';
        html += `<td>${isNaN(avgValue) ? 0 : avgValue}</td>`;
    });
    html += '</tr>';
    html += '</table>';
    document.getElementById('journalTable').innerHTML = html;
}

function editRow(i) {
    let row = journal[i];
    document.getElementById('fio').value = row.fio;
    document.getElementById('class').value = row.class;
    subjects.forEach(s => document.getElementById(subjectToId(s)).value = row[s]);
    editIndex = i;
    document.getElementById('editInfo').innerHTML = 'Редактирование записи. После изменений нажмите "Добавить/Сохранить".';
}

function deleteRow(i) {
    if (confirm('Удалить запись?')) {
        journal.splice(i, 1);
        renderJournal();
        renderUploadTable();
        fillClassSelect();
        renderStatChart();
    }
}

// --- Сохранение файлов ---
function saveToCSV() {
    if (!journal || !journal.length) return alert("Нет данных для сохранения!");
    const headers = ['ФИО', 'Класс', 'Информатика', 'Физика', 'Математика', 'Литература', 'Музыка'];
    const rows = journal.map(obj => [
        obj.fio, obj.class, obj['Информатика'], obj['Физика'], obj['Математика'], obj['Литература'], obj['Музыка']
    ].join(';'));
    const csv = [headers.join(';'), ...rows].join('\r\n');
    const BOM = '\uFEFF';
    downloadFile(BOM + csv, 'journal.csv', 'text/csv');
}

function saveToTXT() {
    if (!journal || !journal.length) return alert("Нет данных для сохранения!");
    const headers = ['ФИО', 'Класс', 'Информатика', 'Физика', 'Математика', 'Литература', 'Музыка'];
    const rows = journal.map(obj => [
        obj.fio, obj.class, obj['Информатика'], obj['Физика'], obj['Математика'], obj['Литература'], obj['Музыка']
    ].join(';'));
    const txt = [headers.join(';'), ...rows].join('\r\n');
    downloadFile(txt, 'journal.txt', 'text/plain');
}

function saveToXLSX() {
    if (!journal || !journal.length) return alert("Нет данных для сохранения!");
    // Формируем массив с русскими заголовками
    const headers = ['ФИО', 'Класс', 'Информатика', 'Физика', 'Математика', 'Литература', 'Музыка'];
    const data = [
        headers,
        ...journal.map(obj => [
            obj.fio,
            obj.class,
            obj['Информатика'],
            obj['Физика'],
            obj['Математика'],
            obj['Литература'],
            obj['Музыка']
        ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Журнал");
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "journal.xlsx";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

function downloadFile(data, filename, mime) {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 0);
}

// --- Табличная статистика ---
function renderStatTable() {
    let byClass = {};
    journal.forEach(r => {
        if (!byClass[r.class]) byClass[r.class] = {};
        subjects.forEach(s => {
            if (!byClass[r.class][s]) byClass[r.class][s] = [];
            byClass[r.class][s].push(r[s]);
        });
    });
    let html = '<h3>По классам и предметам</h3><table><tr><th>Класс</th><th>Предмет</th><th>Средняя</th><th>Медиана</th><th>Кол-во</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>';
    for (let cls in byClass) {
        for (let s of subjects) {
            let grades = byClass[cls][s] || [];
            html += `<tr>
                <td>${cls}</td>
                <td>${s}</td>
                <td>${isNaN(avg(grades)) ? 0 : avg(grades).toFixed(2)}</td>
                <td>${isNaN(median(grades)) ? 0 : median(grades)}</td>
                <td>${grades.filter(v => [2,3,4,5].includes(v)).length}</td>
                <td>${count(grades, 2)} (${perc(grades, 2)}%)</td>
                <td>${count(grades, 3)} (${perc(grades, 3)}%)</td>
                <td>${count(grades, 4)} (${perc(grades, 4)}%)</td>
                <td>${count(grades, 5)} (${perc(grades, 5)}%)</td>
            </tr>`;
        }
    }
    html += '</table>';

    let bySubject = {};
    subjects.forEach(s => bySubject[s] = []);
    journal.forEach(r => {
        subjects.forEach(s => bySubject[s].push(r[s]));
    });
    html += '<h3>По предметам (все классы)</h3><table><tr><th>Предмет</th><th>Средняя</th><th>Медиана</th><th>Кол-во</th><th>2</th><th>3</th><th>4</th><th>5</th></tr>';
    for (let s of subjects) {
        let grades = bySubject[s];
        html += `<tr>
            <td>${s}</td>
            <td>${isNaN(avg(grades)) ? 0 : avg(grades).toFixed(2)}</td>
            <td>${isNaN(median(grades)) ? 0 : median(grades)}</td>
            <td>${grades.filter(v => [2,3,4,5].includes(v)).length}</td>
            <td>${count(grades, 2)} (${perc(grades, 2)}%)</td>
            <td>${count(grades, 3)} (${perc(grades, 3)}%)</td>
            <td>${count(grades, 4)} (${perc(grades, 4)}%)</td>
            <td>${count(grades, 5)} (${perc(grades, 5)}%)</td>
        </tr>`;
    }
    html += '</table>';
    document.getElementById('statTable').innerHTML = html;
}

// --- Графики ---
function fillClassSelect() {
    const select = document.getElementById('classSelect');
    select.innerHTML = '<option value="">Выберите класс</option>';
    const classes = [...new Set(journal.map(item => item.class))].sort();
    classes.forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls;
        select.appendChild(option);
    });
    if (classes.length > 0) {
        select.value = classes[0];
        renderClassChart(classes[0]);
    }
}

function renderClassChart(selectedClass) {
    if (!selectedClass) return;
    const classData = journal.filter(item => item.class === selectedClass);
    const gradeCounts = {
        '2': subjects.map(subj => countGrades(classData, subj, 2)),
        '3': subjects.map(subj => countGrades(classData, subj, 3)),
        '4': subjects.map(subj => countGrades(classData, subj, 4)),
        '5': subjects.map(subj => countGrades(classData, subj, 5))
    };
    const ctx = document.getElementById('classChart').getContext('2d');
    if (classChart) classChart.destroy();
    classChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: subjects,
            datasets: [
                { label: 'Оценка 2', data: gradeCounts['2'], backgroundColor: '#e74c3c' },
                { label: 'Оценка 3', data: gradeCounts['3'], backgroundColor: '#f1c40f' },
                { label: 'Оценка 4', data: gradeCounts['4'], backgroundColor: '#3498db' },
                { label: 'Оценка 5', data: gradeCounts['5'], backgroundColor: '#2ecc71' }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' }, title: { display: true, text: `Статистика оценок для класса ${selectedClass}` } },
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Количество оценок' } },
                x: { title: { display: true, text: 'Предметы' } }
            }
        }
    });
}

function countGrades(data, subject, grade) {
    return data.filter(item => item[subject] === grade).length;
}

function renderStatChart() {
    let bySubject = {};
    subjects.forEach(s => bySubject[s] = []);
    journal.forEach(r => {
        subjects.forEach(s => bySubject[s].push(r[s]));
    });
    let labels = subjects;
    let data2 = labels.map(s => count(bySubject[s], 2));
    let data3 = labels.map(s => count(bySubject[s], 3));
    let data4 = labels.map(s => count(bySubject[s], 4));
    let data5 = labels.map(s => count(bySubject[s], 5));
    let ctx = document.getElementById('statChart').getContext('2d');
    if (chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Оценка 2', data: data2, backgroundColor: '#e74c3c' },
                { label: 'Оценка 3', data: data3, backgroundColor: '#f1c40f' },
                { label: 'Оценка 4', data: data4, backgroundColor: '#3498db' },
                { label: 'Оценка 5', data: data5, backgroundColor: '#2ecc71' }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, stepSize: 1 } }
        }
    });
}

// --- Вспомогательные функции ---
function avg(arr) {
    arr = arr.filter(v => [2, 3, 4, 5].includes(v));
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}
function median(arr) {
    arr = arr.filter(v => [2, 3, 4, 5].includes(v));
    if (!arr.length) return 0;
    arr = arr.slice().sort((a, b) => a - b);
    let m = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[m] : ((arr[m - 1] + arr[m]) / 2).toFixed(2);
}
function count(arr, val) {
    return arr.filter(x => x === val).length;
}
function perc(arr, val) {
    arr = arr.filter(v => [2, 3, 4, 5].includes(v));
    return arr.length ? Math.round(100 * count(arr, val) / arr.length) : 0;
}