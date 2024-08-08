const spreadsheetId = '1VoqMndYpOQv6a_ZrUSWciLNEv1WWB0Fmkp4laHBt-Cw';
const rangeUsers = 'Users!A2:B';
const rangeCourses = 'Courses!A2:E'; // Adjusted to include all necessary columns
const rangeVideos = 'Videos!A2:C';
const apiKey = 'AIzaSyBlN7d0VWpUrUiLjw4co4INU2pCEYLgzh0';

document.addEventListener('DOMContentLoaded', () => {
  const savedUsername = localStorage.getItem('username');
  const savedPassword = localStorage.getItem('password');
  if (savedUsername && savedPassword) {
    document.getElementById('username').value = savedUsername;
    document.getElementById('password').value = savedPassword;
    login(true);
  } else {
    loadCourses();
  }
});

function login(isAutoLogin = false) {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeUsers}?key=${apiKey}`)
    .then(response => response.json())
    .then(data => {
      const users = data.values || [];
      const user = users.find(user => user[0] === username && user[1] === password);
      const messageElement = document.getElementById('message');
      if (user) {
        messageElement.style.color = 'green';
        messageElement.textContent = 'Login successful!';
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('logout-button').style.display = 'block';

        if (!isAutoLogin) {
          localStorage.setItem('username', username);
          localStorage.setItem('password', password);
        }

        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeCourses}?key=${apiKey}`)
          .then(response => response.json())
          .then(courseData => {
            const coursePurchases = courseData.values || [];
            const userCourses = coursePurchases.filter(row => row[0] === username && row[2] === 'TRUE');
            const purchasedCourseCodes = userCourses.map(row => row[1]);
            localStorage.setItem('purchasedCourses', JSON.stringify(purchasedCourseCodes));

            loadCourses(purchasedCourseCodes);
          })
          .catch(error => {
            console.error('Error fetching course data:', error);
          });
      } else {
        messageElement.style.color = 'red';
        messageElement.textContent = 'Incorrect username or password';
      }
    })
    .catch(error => {
      console.error('Error:', error);
      const messageElement = document.getElementById('message');
      messageElement.style.color = 'red';
      messageElement.textContent = 'An error occurred. Please try again.';
    });
}

function loadCourses(purchasedCourseCodes = []) {
  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeCourses}?key=${apiKey}`)
    .then(response => response.json())
    .then(courseData => {
      const courses = courseData.values || [];
      const uniqueCourses = getUniqueCourses(courses);
      const courseListElement = document.getElementById('course-list');
      courseListElement.innerHTML = ''; // Clear previous courses

      uniqueCourses.forEach(course => {
        const [username, code, _, title, coverUrl] = course;
        if (purchasedCourseCodes.includes(code)) {
          const div = document.createElement('div');
          div.className = 'course';
          div.innerHTML = `
            <img src="${coverUrl}" alt="${title} Cover">
            <div class="course-title">${title}</div>
          `;
          div.addEventListener('click', () => {
            if (userLoggedIn()) {
              gotoCourseVideos(code);
            } else {
              alert('Please log in to view the videos.');
            }
          });
          courseListElement.appendChild(div);
        }
      });
    })
    .catch(error => {
      console.error('Error fetching courses:', error);
    });
}

function getUniqueCourses(courses) {
  const seen = new Set();
  return courses.filter(course => {
    const code = course[1];
    if (seen.has(code)) {
      return false;
    } else {
      seen.add(code);
      return true;
    }
  });
}

function gotoCourseVideos(courseCode) {
  window.location.href = `course.html?courseCode=${courseCode}`;
}

function logout() {
  localStorage.removeItem('username');
  localStorage.removeItem('password');
  localStorage.removeItem('purchasedCourses');
  document.getElementById('login-form').style.display = 'block';
  document.getElementById('main-content').style.display = 'none';
  document.getElementById('logout-button').style.display = 'none';
}

function userLoggedIn() {
  return localStorage.getItem('username') && localStorage.getItem('password');
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const courseCode = urlParams.get('courseCode');
  const videoListElement = document.getElementById('video-list');
  const videoPlayerElement = document.getElementById('video-player');
  const courseTitleElement = document.getElementById('course-title');

  if (!courseCode) {
    courseTitleElement.textContent = 'Course not found';
    return;
  }

  fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${rangeVideos}?key=${apiKey}`)
    .then(response => response.json())
    .then(data => {
      const videos = data.values.filter(row => row[0] === courseCode);
      if (!videos.length) {
        courseTitleElement.textContent = 'No videos found for this course';
        return;
      }

      let currentIndex = 0;

      // function loadVideo(index) {
      //   if (index >= 0 && index < videos.length) {
      //     currentIndex = index;
      //     videoPlayerElement.src = videos[currentIndex][2];
      //   }
      // }
      function loadVideo(index) {
        if (index >= 0 && index < videos.length) {
          currentIndex = index;
          const fileId = videos[currentIndex][2]; // Assuming this column contains the Google Drive file ID
          videoPlayerElement.src = `https://drive.google.com/file/d/${fileId}/preview`;
        }
      }

      function changeVideo(direction) {
        const newIndex = currentIndex + direction;
        if (newIndex >= 0 && newIndex < videos.length) {
          loadVideo(newIndex);
        }
      }

      document.getElementById('prev-video').addEventListener('click', () => changeVideo(-1));
      document.getElementById('next-video').addEventListener('click', () => changeVideo(1));

      videos.forEach((video, index) => {
        const li = document.createElement('li');
        li.textContent = `Lesson ${video[1]}`;
        li.addEventListener('click', () => loadVideo(index));
        videoListElement.appendChild(li);
      });

      loadVideo(0);
    })
    .catch(error => {
      console.error('Error fetching videos:', error);
      courseTitleElement.textContent = 'Error loading videos';
    });
});