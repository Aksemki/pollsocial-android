let API = '';
let token = null;
let currentUser = null;
let currentPollForComments = null;
let currentPollForBet = null;
let selectedBetOption = null;
let currentFilter = 'all';
let currentTab = 'active';
let selectedUsersForPoll = [];

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Cordova готова!');
    
    const savedServer = localStorage.getItem('serverUrl');
    const savedToken = localStorage.getItem('token');
    
    if (savedServer) {
        API = savedServer + '/api';
        document.getElementById('serverUrl').value = savedServer;
    }
    
    if (savedToken) {
        token = savedToken;
        loadProfile();
    }
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    
    const fab = document.getElementById('mainFab');
    if (screenId === 'mainScreen') {
        fab.style.display = 'flex';
    } else {
        fab.style.display = 'none';
    }
}

function showLogin() { showScreen('loginScreen'); }
function showRegister() { showScreen('registerScreen'); }

function toggleSearch() {
    const searchContainer = document.getElementById('searchContainer');
    if (searchContainer.style.display === 'none' || !searchContainer.style.display) {
        searchContainer.style.display = 'block';
        loadUserSuggestions();
    } else {
        searchContainer.style.display = 'none';
    }
}

let searchTimeout = null;

async function searchUsers(query, filter = 'all') {
    const resultsContainer = document.getElementById('searchResults');

    if (!query || query.trim().length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    resultsContainer.innerHTML = '<div class="loading">Поиск пользователей...</div>';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`${API}/users/search?q=${encodeURIComponent(query)}&filter=${filter}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) throw new Error('Ошибка поиска');
            const users = await res.json();
            renderSearchResults(users);
        } catch (error) {
            console.error('Search error:', error);
            resultsContainer.innerHTML = '<div class="empty-state"><h3>Ошибка поиска</h3></div>';
        }
    }, 300);
}

function renderSearchResults(users) {
    const container = document.getElementById('searchResults');

    if (users.length === 0) {
        container.innerHTML = '<div class="empty-state"><h3>Никого не найдено</h3></div>';
        return;
    }

    container.innerHTML = users.map(user => `
        <div class="user-card">
            <div class="avatar" onclick="viewUserProfile('${user.id}')">
                ${user.username[0].toUpperCase()}
            </div>
            <div class="user-card-info" onclick="viewUserProfile('${user.id}')">
                <div class="user-card-name">${user.username}</div>
                <div class="user-card-bio">${user.bio || 'Нет информации'}</div>
                <div class="user-card-stats">
                    ${user.followersCount || 0} подписчиков • ${user.rating || 0} ⭐
                </div>
            </div>
            <button class="follow-btn ${user.isFollowing ? 'following' : ''}"
                    onclick="event.stopPropagation(); toggleFollow('${user.id}', event)">
                ${user.isFollowing ? 'Отписаться' : 'Подписаться'}
            </button>
        </div>
    `).join('');
}

async function toggleFollow(userId, event) {
    event.stopPropagation();
    const btn = event.target;
    const isFollowing = btn.classList.contains('following');

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '...';

    try {
        const res = await fetch(`${API}/follow/${userId}`, {
            method: isFollowing ? 'DELETE' : 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Ошибка подписки');
        }

        btn.classList.toggle('following');
        btn.textContent = isFollowing ? 'Подписаться' : 'Отписаться';
        await loadProfile();

    } catch (error) {
        alert('❌ ' + error.message);
        btn.textContent = originalText;
    } finally {
        btn.disabled = false;
    }
}

async function viewUserProfile(userId) {
    try {
        const res = await fetch(`${API}/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Ошибка загрузки профиля');
        }

        const user = await res.json();
        showUserProfileModal(user);
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

function showUserProfileModal(user) {
    const modal = document.getElementById('userProfileModal');
    const content = modal.querySelector('.modal-content');

    content.innerHTML = `
        <div class="modal-header">
            <h2>Профиль</h2>
            <button class="modal-close" onclick="closeModal('userProfileModal')">×</button>
        </div>
        <div style="text-align: center; padding: 20px;">
            <div class="user-avatar" style="width: 80px; height: 80px; margin: 0 auto 15px; font-size: 32px;">
                ${user.username[0].toUpperCase()}
            </div>
            <h2>${user.username}</h2>
            <p style="color: #666; margin: 10px 0;">${user.bio || 'Нет информации'}</p>
            <div style="display: flex; justify-content: center; gap: 30px; margin: 20px 0;">
                <div><div style="font-size: 20px; font-weight: bold;">${user.pollsCount || 0}</div><div style="font-size: 12px; color: #999;">Опросов</div></div>
                <div><div style="font-size: 20px; font-weight: bold;">${user.followersCount || 0}</div><div style="font-size: 12px; color: #999;">Подписчиков</div></div>
                <div><div style="font-size: 20px; font-weight: bold;">${user.followingCount || 0}</div><div style="font-size: 12px; color: #999;">Подписок</div></div>
                <div><div style="font-size: 20px; font-weight: bold;">${user.rating || 0}</div><div style="font-size: 12px; color: #999;">Рейтинг ⭐</div></div>
            </div>
            ${user.id !== currentUser.id ? `
                <button class="follow-btn ${user.isFollowing ? 'following' : ''}"
                        onclick="toggleFollowInModal('${user.id}')">
                    ${user.isFollowing ? 'Отписаться' : 'Подписаться'}
                </button>
            ` : ''}
        </div>
    `;

    modal.classList.add('active');
}

async function toggleFollowInModal(userId) {
    const btn = event.target;
    const isFollowing = btn.classList.contains('following');

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = '...';

    try {
        const res = await fetch(`${API}/follow/${userId}`, {
            method: isFollowing ? 'DELETE' : 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Ошибка подписки');
        }

        btn.classList.toggle('following');
        btn.textContent = isFollowing ? 'Подписаться' : 'Отписаться';
        await loadProfile();
    } catch (error) {
        alert('❌ ' + error.message);
        btn.textContent = originalText;
    } finally {
        btn.disabled = false;
    }
}

async function loadUserSuggestions() {
    try {
        const res = await fetch(`${API}/users/suggestions?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) return;
        const suggestions = await res.json();
        if (suggestions.length === 0) return;

        const container = document.getElementById('userSuggestions');
        if (!container) return;

        container.style.display = 'block';
        container.innerHTML = `
            <h3 style="font-size: 14px; color: #666; margin-bottom: 10px;">
                👥 Рекомендации
            </h3>
            ${suggestions.map(user => `
                <div class="suggestion-card" onclick="viewUserProfile('${user.id}')">
                    <div class="mini-avatar">${user.username[0].toUpperCase()}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 13px;">${user.username}</div>
                        <div style="font-size: 11px; color: #999;">${user.followersCount || 0} подписчиков</div>
                    </div>
                    <button class="secondary-btn" style="width: auto; padding: 6px 12px; font-size: 12px;"
                            onclick="event.stopPropagation(); toggleFollow('${user.id}', event)">
                        Подписаться
                    </button>
                </div>
            `).join('')}
        `;
    } catch (error) {
        console.error('Suggestions error:', error);
    }
}

async function register() {
    const username = document.getElementById('regUsername').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const bio = document.getElementById('regBio').value.trim();
    const serverUrl = document.getElementById('serverUrl').value.trim();

    if (!serverUrl) {
        alert('❌ Укажите адрес сервера');
        return;
    }

    API = serverUrl + '/api';
    localStorage.setItem('serverUrl', serverUrl);

    try {
        const res = await fetch(`${API}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, bio })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);

        initMainScreen();
        alert('✅ Регистрация успешна!');
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

async function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const serverUrl = document.getElementById('serverUrl').value.trim();

    if (!serverUrl) {
        alert('❌ Укажите адрес сервера');
        return;
    }

    API = serverUrl + '/api';
    localStorage.setItem('serverUrl', serverUrl);

    try {
        const res = await fetch(`${API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        token = data.token;
        currentUser = data.user;
        localStorage.setItem('token', token);

        initMainScreen();
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

async function loadProfile() {
    try {
        const res = await fetch(`${API}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error();

        currentUser = await res.json();
        initMainScreen();
    } catch {
        localStorage.removeItem('token');
        token = null;
        showLogin();
    }
}

function initMainScreen() {
    showScreen('mainScreen');
    document.getElementById('navbar').style.display = 'flex';
    updateUserProfile();
    loadFeed();
    loadMyBets();
}

function updateUserProfile() {
    document.getElementById('navAvatar').textContent = currentUser.username[0].toUpperCase();
    document.getElementById('userAvatar').textContent = currentUser.username[0].toUpperCase();
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userRating').textContent = currentUser.rating || 0;
    document.getElementById('userCoins').textContent = currentUser.coins || 1000;
}

async function showProfile() {
    if (!currentUser) return;
    
    document.getElementById('profilePageAvatar').textContent = currentUser.username[0].toUpperCase();
    document.getElementById('profilePageUsername').textContent = currentUser.username;
    document.getElementById('profilePageBio').textContent = currentUser.bio || 'Расскажите о себе...';
    document.getElementById('profilePagePolls').textContent = currentUser.pollsCount || 0;
    document.getElementById('profilePageFollowers').textContent = currentUser.followersCount || 0;
    document.getElementById('profilePageRating').textContent = currentUser.rating || 0;
    document.getElementById('profilePageCoins').textContent = currentUser.coins || 1000;
    
    showScreen('profileScreen');
    
    try {
        await loadMyPolls();
    } catch (error) {
        console.error('Error loading polls:', error);
    }
}

function showFeed() {
    showScreen('mainScreen');
    switchTab('active', null);
}

async function loadMyPolls() {
    const container = document.getElementById('profilePagePollsList');
    container.innerHTML = '<div class="loading">Загрузка...</div>';
    
    try {
        const res = await fetch(`${API}/feed?filter=all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Ошибка загрузки опросов');
        
        const polls = await res.json();
        const myPolls = polls.filter(p => p.author.id === currentUser.id);
        
        if (myPolls.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>Вы еще не создали опросов</h3></div>';
            return;
        }
        
        container.innerHTML = myPolls.map(poll => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
            const isClosed = poll.status === 'closed';
            return `
                <div class="poll-card">
                    <div class="poll-title">
                        ${poll.title}
                        <span class="poll-status ${poll.status}">${isClosed ? 'Завершен' : 'Активен'}</span>
                    </div>
                    ${poll.options.map(opt => {
                        const perc = totalVotes > 0 ? (opt.votes / totalVotes * 100) : 0;
                        return `
                            <div class="poll-option voted" style="--percentage: ${perc}%">
                                <span>${opt.text}</span>
                                <span><b>${opt.votes}</b> (${perc.toFixed(0)}%)</span>
                            </div>
                        `;
                    }).join('')}
                    ${!isClosed ? `<button class="close-poll-btn" onclick="closePoll('${poll.id}')">Завершить опрос</button>` : ''}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Load polls error:', error);
        container.innerHTML = '<div class="empty-state"><h3>Ошибка загрузки</h3></div>';
    }
}

function editProfile() {
    const newBio = prompt('Введите информацию о себе:', currentUser.bio || '');
    if (newBio === null) return;
    
    fetch(`${API}/profile`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bio: newBio })
    }).then(() => {
        currentUser.bio = newBio;
        document.getElementById('profilePageBio').textContent = newBio || 'Расскажите о себе...';
        alert('✅ Профиль обновлен!');
    }).catch(() => {
        alert('❌ Ошибка обновления');
    });
}

function logout() {
    if (confirm('Выйти из аккаунта?')) {
        localStorage.removeItem('token');
        token = null;
        currentUser = null;
        document.getElementById('navbar').style.display = 'none';
        showLogin();
    }
}

function switchTab(tab, eventObj) {
    currentTab = tab;
    
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    
    if (eventObj && eventObj.target) {
        eventObj.target.classList.add('active');
    } else {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach((t, index) => {
            if ((tab === 'active' && index === 0) ||
                (tab === 'history' && index === 1) ||
                (tab === 'results' && index === 2)) {
                t.classList.add('active');
            }
        });
    }

    document.getElementById('activeContent').style.display = tab === 'active' ? 'block' : 'none';
    document.getElementById('historyContent').style.display = tab === 'history' ? 'block' : 'none';
    document.getElementById('resultsContent').style.display = tab === 'results' ? 'block' : 'none';

    if (tab === 'active') loadFeed();
    if (tab === 'history') loadHistory();
    if (tab === 'results') loadMyResults();
}

async function loadFeed() {
    const feed = document.getElementById('pollsFeed');
    feed.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        const res = await fetch(`${API}/feed?filter=${currentFilter}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const polls = await res.json();
        renderPolls(polls);
    } catch (error) {
        feed.innerHTML = '<div class="empty-state"><h3>Ошибка загрузки</h3></div>';
    }
}

function renderPolls(polls) {
    const feed = document.getElementById('pollsFeed');
    
    if (polls.length === 0) {
        feed.innerHTML = '<div class="empty-state"><h3>Пока нет опросов</h3></div>';
        return;
    }

    feed.innerHTML = polls.map(poll => {
        const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
        const isAuthor = poll.author.id === currentUser.id;
        const isClosed = poll.status === 'closed';
        
        return `
            <div class="poll-card">
                <div class="poll-header">
                    <div class="avatar">${poll.author.username[0].toUpperCase()}</div>
                    <div class="poll-author-info">
                        <div class="poll-author-name">${poll.author.username}</div>
                        <div class="poll-time">${formatTime(poll.createdAt)}</div>
                    </div>
                    <span class="category-badge">${poll.category}</span>
                </div>
                <div class="poll-title">
                    ${poll.title}
                    <span class="poll-status ${poll.status}">${isClosed ? 'Завершен' : 'Активен'}</span>
                </div>
                <div class="poll-description">${poll.description}</div>
                <div>
                    ${poll.options.map(opt => {
                        const perc = totalVotes > 0 ? (opt.votes / totalVotes * 100) : 0;
                        return `
                            <div class="poll-option ${poll.hasVoted ? 'voted' : ''}" 
                                 style="--percentage: ${perc}%"
                                 onclick="${poll.hasVoted || isClosed ? '' : `vote('${poll.id}', '${opt.id}')`}">
                                <span>${opt.text}</span>
                                ${poll.hasVoted ? `<span><b>${opt.votes}</b> (${perc.toFixed(0)}%)</span>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
                ${poll.allowBetting && poll.hasVoted && !isClosed ? 
                    `<span class="bet-badge" onclick="openBetModal('${poll.id}')">🎲 Сделать ставку</span>` : ''}
                ${isAuthor && !isClosed && poll.hasVoted ? 
                    `<button class="close-poll-btn" onclick="closePoll('${poll.id}')">Завершить опрос</button>` : ''}
                <div class="poll-actions">
                    <div class="action-btn ${poll.hasLiked ? 'active' : ''}" onclick="toggleLike('${poll.id}')">❤️ ${poll.likesCount}</div>
                    <div class="action-btn" onclick="openComments('${poll.id}')">💬 ${poll.commentsCount}</div>
                </div>
            </div>
        `;
    }).join('');
}

async function vote(pollId, optionId) {
    try {
        await fetch(`${API}/polls/${pollId}/vote`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ optionId })
        });
        loadProfile();
        loadFeed();
    } catch (error) {
        alert('❌ Ошибка голосования');
    }
}

async function toggleLike(pollId) {
    try {
        await fetch(`${API}/polls/${pollId}/like`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        loadFeed();
    } catch (error) {
        alert('❌ Ошибка');
    }
}

async function openComments(pollId) {
    currentPollForComments = pollId;
    document.getElementById('commentsModal').classList.add('active');

    try {
        const res = await fetch(`${API}/polls/${pollId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const comments = await res.json();
        renderComments(comments);
    } catch (error) {
        console.error(error);
    }
}

function renderComments(comments) {
    const list = document.getElementById('commentsList');
    if (comments.length === 0) {
        list.innerHTML = '<div class="empty-state"><h3>Пока нет комментариев</h3></div>';
        return;
    }
    list.innerHTML = comments.map(c => `
        <div class="comment">
            <div class="comment-header">
                <div class="mini-avatar">${c.author.username[0].toUpperCase()}</div>
                <span class="comment-author">${c.author.username}</span>
            </div>
            <div class="comment-text">${c.text}</div>
        </div>
    `).join('');
}

async function addComment() {
    const text = document.getElementById('newComment').value.trim();
    if (!text) return;

    try {
        await fetch(`${API}/polls/${currentPollForComments}/comments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        document.getElementById('newComment').value = '';
        openComments(currentPollForComments);
        loadFeed();
    } catch (error) {
        alert('❌ Ошибка');
    }
}

function changeFilter(filter, event) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    loadFeed();
}

function openCreatePoll() {
    document.getElementById('createPollModal').classList.add('active');
}

function addOption() {
    const list = document.getElementById('optionsList');
    const num = list.querySelectorAll('.input-group').length + 1;
    const div = document.createElement('div');
    div.className = 'input-group';
    div.innerHTML = `
        <label>Вариант ${num}</label>
        <input type="text" class="option-input" placeholder="Вариант ${num}">
        <button class="option-remove" onclick="this.parentElement.remove()">Удалить</button>
    `;
    list.appendChild(div);
}

async function createPoll() {
    const title = document.getElementById('pollTitle').value.trim();
    const description = document.getElementById('pollDescription').value.trim();
    const category = document.getElementById('pollCategory').value;
    const allowBetting = document.getElementById('allowBetting').checked;
    const visibility = document.getElementById('pollVisibility').value;

    const optionInputs = document.querySelectorAll('.option-input');
    const options = Array.from(optionInputs)
        .map(input => input.value.trim())
        .filter(val => val !== '')
        .map(text => ({ text }));

    if (!title || options.length < 2) {
        alert('❌ Заполните название и минимум 2 варианта');
        return;
    }

    if (visibility === 'selected' && selectedUsersForPoll.length === 0) {
        alert('❌ Выберите хотя бы одного пользователя');
        return;
    }

    try {
        const requestBody = {
            title,
            description,
            category,
            allowBetting,
            visibility,
            options
        };

        if (visibility === 'selected') {
            requestBody.selectedUsers = selectedUsersForPoll.map(u => u.id);
        }

        const res = await fetch(`${API}/polls`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || 'Ошибка создания опроса');
        }

        closeModal('createPollModal');

        document.getElementById('pollTitle').value = '';
        document.getElementById('pollDescription').value = '';
        document.getElementById('allowBetting').checked = false;
        document.getElementById('pollVisibility').value = 'public';
        selectedUsersForPoll = [];
        handleVisibilityChange();

        document.getElementById('optionsList').innerHTML = `
            <div class="input-group"><label>Вариант 1</label><input type="text" class="option-input" placeholder="Первый вариант"></div>
            <div class="input-group"><label>Вариант 2</label><input type="text" class="option-input" placeholder="Второй вариант"></div>
        `;

        loadFeed();
        alert('✅ Опрос создан!');

    } catch (error) {
        alert('❌ ' + error.message);
    }
}

function handleVisibilityChange() {
    const visibility = document.getElementById('pollVisibility').value;
    const container = document.getElementById('selectedUsersContainer');

    if (visibility === 'selected') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        selectedUsersForPoll = [];
        updateSelectedUsersList();
    }
}

async function openUserSelector() {
    const modal = document.getElementById('userSelectorModal');
    modal.classList.add('active');

    try {
        const res = await fetch(`${API}/following/${currentUser.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Ошибка загрузки подписок');

        const users = await res.json();
        renderUserSelector(users);
    } catch (error) {
        console.error('Error loading following:', error);
        alert('❌ Ошибка загрузки списка пользователей');
    }
}

function renderUserSelector(users) {
    const list = document.getElementById('userSelectorList');

    if (users.length === 0) {
        list.innerHTML = '<div class="empty-state"><h3>Нет подписок</h3></div>';
        return;
    }

    list.innerHTML = users.map(user => {
        const isSelected = selectedUsersForPoll.some(u => u.id === user.id);
        return `
            <div class="user-card" onclick="toggleUserSelection('${user.id}', '${user.username.replace(/'/g, "\\'")}', event)"
                 style="cursor: pointer; ${isSelected ? 'background: #e3f2fd; border: 2px solid #667eea;' : ''}">
                <div class="mini-avatar">${user.username[0].toUpperCase()}</div>
                <div class="user-card-info" style="flex: 1;">
                    <div class="user-card-name">${user.username}</div>
                    <div class="user-card-stats">${user.followersCount || 0} подписчиков</div>
                </div>
                <div style="font-size: 20px;">
                    ${isSelected ? '✅' : '⭕'}
                </div>
            </div>
        `;
    }).join('');
}

function toggleUserSelection(userId, username, event) {
    const index = selectedUsersForPoll.findIndex(u => u.id === userId);

    if (index > -1) {
        selectedUsersForPoll.splice(index, 1);
    } else {
        selectedUsersForPoll.push({ id: userId, username: username });
    }

    updateSelectedUsersList();

    const userCard = event.currentTarget;
    const isSelected = selectedUsersForPoll.some(u => u.id === userId);

    if (isSelected) {
        userCard.style.background = '#e3f2fd';
        userCard.style.border = '2px solid #667eea';
        userCard.querySelector('div:last-child').textContent = '✅';
    } else {
        userCard.style.background = '';
        userCard.style.border = '';
        userCard.querySelector('div:last-child').textContent = '⭕';
    }
}

function updateSelectedUsersList() {
    const countElement = document.getElementById('selectedUsersCount');
    const listElement = document.getElementById('selectedUsersList');

    if (!countElement || !listElement) return;

    countElement.textContent = selectedUsersForPoll.length;

    if (selectedUsersForPoll.length === 0) {
        listElement.innerHTML = '<p style="color: #999;">Пользователи не выбраны</p>';
    } else {
        listElement.innerHTML = selectedUsersForPoll.map(u =>
            `<span style="display: inline-block; background: #e3f2fd; padding: 4px 8px; border-radius: 12px; margin: 2px;">
                ${u.username} <span onclick="removeSelectedUser('${u.id}')" style="cursor: pointer; margin-left: 4px;">×</span>
            </span>`
        ).join('');
    }
}

function removeSelectedUser(userId) {
    selectedUsersForPoll = selectedUsersForPoll.filter(u => u.id !== userId);
    updateSelectedUsersList();
}

function confirmUserSelection() {
    updateSelectedUsersList();
    closeModal('userSelectorModal');
}

function searchUsersForSelector(query) {
    if (!query || query.trim().length < 2) {
        openUserSelector();
        return;
    }

    const list = document.getElementById('userSelectorList');
    list.innerHTML = '<div class="loading">Поиск...</div>';

    fetch(`${API}/users/search?q=${encodeURIComponent(query)}&filter=following`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(users => {
        renderUserSelector(users);
    }).catch(() => {
        list.innerHTML = '<div class="empty-state"><h3>Ошибка поиска</h3></div>';
    });
}

function openBetModal(pollId) {
    currentPollForBet = pollId;
    selectedBetOption = null;
    document.getElementById('betModal').classList.add('active');
    document.getElementById('modalCoins').textContent = currentUser.coins;
    
    fetch(`${API}/feed?filter=all`, {
        headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(polls => {
        const poll = polls.find(p => p.id === pollId);
        if (poll) {
            document.getElementById('betOptions').innerHTML = poll.options.map(opt => `
                <div class="poll-option" onclick="selectBetOption('${opt.id}', event)" data-option="${opt.id}">
                    <span>${opt.text}</span>
                    <span style="color: #999; font-size: 12px;">${opt.votes} голосов</span>
                </div>
            `).join('');
        }
    });
}

function selectBetOption(optionId, event) {
    selectedBetOption = optionId;
    document.querySelectorAll('#betOptions .poll-option').forEach(opt => {
        opt.style.borderColor = opt.dataset.option === optionId ? '#ff9800' : '#e0e0e0';
        opt.style.background = opt.dataset.option === optionId ? '#fff3e0' : '#f9f9f9';
    });
}

function setQuickAmount(amount) {
    document.getElementById('betAmount').value = amount;
}

async function placeBet() {
    if (!selectedBetOption) {
        alert('❌ Выберите вариант для ставки');
        return;
    }

    const amount = parseInt(document.getElementById('betAmount').value);
    
    if (!amount || amount <= 0) {
        alert('❌ Введите корректную сумму');
        return;
    }

    if (amount > currentUser.coins) {
        alert('❌ Недостаточно монет!');
        return;
    }

    try {
        const res = await fetch(`${API}/bets`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pollId: currentPollForBet,
                optionId: selectedBetOption,
                amount: amount
            })
        });

        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error);
        }

        closeModal('betModal');
        document.getElementById('betAmount').value = '';
        loadProfile();
        alert(`✅ Ставка ${amount} 🪙 принята!`);
    } catch (error) {
        alert('❌ ' + error.message);
    }
}

async function closePoll(pollId) {
    if (!confirm('Завершить опрос и выплатить выигрыши?')) return;

    try {
        const res = await fetch(`${API}/polls/${pollId}/close`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error();

        const data = await res.json();
        alert(data.message || '✅ Опрос завершен!');
        loadProfile();
        loadFeed();
    } catch (error) {
        alert('❌ Ошибка завершения опроса');
    }
}

async function loadHistory() {
    const list = document.getElementById('historyList');
    list.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        const res = await fetch(`${API}/feed?filter=all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const polls = await res.json();
        
        const closedPolls = polls.filter(p => p.status === 'closed');
        const myVotes = polls.filter(p => p.voters && p.voters.includes(currentUser.id));
        
        document.getElementById('totalPolls').textContent = closedPolls.length;
        document.getElementById('totalVotes').textContent = myVotes.length;

        await loadBetsHistory();

        if (closedPolls.length === 0) {
            list.innerHTML = '<div class="empty-state"><h3>История пуста</h3></div>';
        } else {
            list.innerHTML = closedPolls.map(poll => {
                const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
                return `
                    <div class="poll-card">
                        <div class="poll-title">${poll.title} <span class="poll-status closed">Завершен</span></div>
                        ${poll.options.map(opt => {
                            const perc = totalVotes > 0 ? (opt.votes / totalVotes * 100) : 0;
                            return `
                                <div class="poll-option voted" style="--percentage: ${perc}%">
                                    <span>${opt.text}</span>
                                    <span><b>${opt.votes}</b> (${perc.toFixed(0)}%)</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        list.innerHTML = '<div class="empty-state"><h3>Ошибка загрузки</h3></div>';
    }
}

let currentResultsFilter = 'all';

async function loadMyResults(filter = 'all') {
    currentResultsFilter = filter;
    const list = document.getElementById('resultsList');
    list.innerHTML = '<div class="loading">Загрузка...</div>';

    try {
        const res = await fetch(`${API}/feed?filter=all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('Ошибка загрузки');
        
        const allPolls = await res.json();
        const myPolls = allPolls.filter(poll => 
            poll.voters && poll.voters.includes(currentUser.id)
        );
        
        if (myPolls.length === 0) {
            list.innerHTML = '<div class="empty-state"><h3>Вы еще не участвовали в опросах</h3></div>';
            return;
        }

        let filteredPolls = myPolls;
        if (filter !== 'all') {
            const betsRes = await fetch(`${API}/bets/history`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const betsData = await betsRes.json();
            const userBets = betsData.bets || [];
            
            if (filter === 'won') {
                const wonPollIds = userBets.filter(b => b.status === 'won').map(b => b.poll.id);
                filteredPolls = myPolls.filter(p => wonPollIds.includes(p.id));
            } else if (filter === 'lost') {
                const lostPollIds = userBets.filter(b => b.status === 'lost').map(b => b.poll.id);
                filteredPolls = myPolls.filter(p => lostPollIds.includes(p.id));
            }
        }
        
        if (filteredPolls.length === 0) {
            list.innerHTML = `<div class="empty-state"><h3>Нет результатов</h3></div>`;
            return;
        }

        list.innerHTML = filteredPolls.map(poll => {
            const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
            const isClosed = poll.status === 'closed';
            
            let myVoteOption = null;
            for (const option of poll.options) {
                const percentage = totalVotes > 0 ? (option.votes / totalVotes * 100) : 0;
                if (percentage > 0 && !myVoteOption) {
                    myVoteOption = option;
                }
            }
            
            let winningOption = poll.options[0];
            for (const option of poll.options) {
                if (option.votes > winningOption.votes) {
                    winningOption = option;
                }
            }
            
            const isWinner = myVoteOption && myVoteOption.id === winningOption.id && isClosed;
            
            return `
                <div class="poll-card">
                    <div class="poll-header">
                        <div class="avatar">${poll.author.username[0].toUpperCase()}</div>
                        <div class="poll-author-info">
                            <div class="poll-author-name">${poll.author.username}</div>
                            <div class="poll-time">${formatTime(poll.createdAt)}</div>
                        </div>
                        <span class="category-badge">${poll.category}</span>
                    </div>
                    
                    <div class="poll-title">
                        ${poll.title}
                        <span class="poll-status ${poll.status}">
                            ${isClosed ? 'Завершен' : 'Активен'}
                        </span>
                        ${isWinner ? '<span class="winner-badge">🏆 Победа!</span>' : ''}
                    </div>
                    
                    ${poll.description ? `<div class="poll-description">${poll.description}</div>` : ''}
                    
                    <div>
                        ${poll.options.map(opt => {
                            const perc = totalVotes > 0 ? (opt.votes / totalVotes * 100) : 0;
                            const isMyVote = myVoteOption && opt.id === myVoteOption.id;
                            const isWinningOpt = isClosed && opt.id === winningOption.id;
                            
                            return `
                                <div class="poll-option voted" 
                                     style="--percentage: ${perc}%; 
                                            ${isMyVote ? 'border: 2px solid #667eea;' : ''}
                                            ${isWinningOpt ? 'background: linear-gradient(90deg, #ffd70030 ' + perc + '%, #f9f9f9 ' + perc + '%);' : ''}">
                                    <span>
                                        ${isMyVote ? '✓ ' : ''}${opt.text}
                                        ${isWinningOpt ? ' 🏆' : ''}
                                    </span>
                                    <span><b>${opt.votes}</b> (${perc.toFixed(0)}%)</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <div class="poll-actions">
                        <div class="action-btn">📊 Всего голосов: ${totalVotes}</div>
                        ${poll.commentsCount > 0 ? `<div class="action-btn" onclick="openComments('${poll.id}')">💬 ${poll.commentsCount}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Results error:', error);
        list.innerHTML = '<div class="empty-state"><h3>Ошибка загрузки</h3></div>';
    }
}

function filterResults(filter, event) {
    document.querySelectorAll('#resultsContent .filter-btn').forEach(btn => 
        btn.classList.remove('active')
    );
    event.target.classList.add('active');
    loadMyResults(filter);
}

async function loadMyBets() {
    try {
        const res = await fetch(`${API}/bets/active`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Ошибка загрузки ставок');

        const bets = await res.json();
        const container = document.getElementById('myBetsList');
        const section = document.getElementById('myBetsSection');

        if (bets.length === 0) {
            section.style.display = 'none';
            return;
        }

        section.style.display = 'block';
        container.innerHTML = bets.map(bet => {
            const poll = bet.poll;
            const option = bet.option;

            return `
                <div class="bet-item active">
                    <div><strong>Опрос:</strong> ${poll.title}</div>
                    <div><strong>Ваш выбор:</strong> ${option.text}</div>
                    <div><strong>Ставка:</strong> ${bet.amount} 🪙</div>
                    <div style="font-size: 10px; color: #999; margin-top: 5px;">
                        Текущий счет: ${option.votes} голосов
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Load bets error:', error);
    }
}

async function loadBetsHistory() {
    try {
        const res = await fetch(`${API}/bets/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        document.getElementById('wonBets').textContent = data.stats.wonCount;
        document.getElementById('totalWinnings').textContent = data.stats.totalWinnings + ' 🪙';

        const container = document.getElementById('betsHistoryList');
        if (!container) return;

        if (data.bets.length === 0) {
            container.innerHTML = '<div class="empty-state"><h3>История ставок пуста</h3></div>';
            return;
        }

        container.innerHTML = data.bets.map(bet => {
            const statusClass = bet.status === 'won' ? 'won' : 'lost';
            const statusText = bet.status === 'won' ?
                `✅ Выиграли ${bet.winAmount} 🪙` :
                `❌ Проиграли ${bet.amount} 🪙`;

            return `
                <div class="bet-item ${statusClass}">
                    <div><strong>${bet.poll.title}</strong></div>
                    <div>Ваш выбор: ${bet.option.text}</div>
                    <div>${statusText}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Load bets history error:', error);
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'только что';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч';
    return Math.floor(diff / 86400) + ' д';
}
