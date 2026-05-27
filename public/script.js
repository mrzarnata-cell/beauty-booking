const services = [
  'Haircut & Styling',
  'Hair Coloring',
  'Manicure',
  'Pedicure',
  'Facial Treatment',
  'Makeup',
  'Eyelash Extensions',
  'Eyebrow Shaping',
  'Massage Therapy',
  'Waxing',
  'Body Scrub',
  'Bridal Package',
  'Other'
];

const serviceSelect = document.getElementById('service');
services.forEach(s => {
  const opt = document.createElement('option');
  opt.value = s;
  opt.textContent = s;
  serviceSelect.appendChild(opt);
});

const dateInput = document.getElementById('date');
const today = new Date().toISOString().split('T')[0];
dateInput.setAttribute('min', today);

const timeSlotsDiv = document.getElementById('time-slots');
let selectedTime = null;

dateInput.addEventListener('change', async () => {
  const date = dateInput.value;
  if (!date) return;

  timeSlotsDiv.innerHTML = '<p style="color:#999;font-size:0.9rem;">Loading available times...</p>';
  selectedTime = null;

  try {
    const res = await fetch(`/api/slots?date=${date}`);
    const slots = await res.json();
    renderTimeSlots(slots);
  } catch {
    timeSlotsDiv.innerHTML = '<p style="color:#c62828;">Failed to load times. Try again.</p>';
  }
});

function renderTimeSlots(slots) {
  timeSlotsDiv.innerHTML = '';
  if (slots.length === 0) {
    timeSlotsDiv.innerHTML = '<p style="color:#999;font-size:0.9rem;">No available times for this date.</p>';
    return;
  }
  slots.forEach(slot => {
    const div = document.createElement('div');
    div.className = 'time-slot';
    div.textContent = slot;
    div.addEventListener('click', () => {
      document.querySelectorAll('.time-slot').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
      selectedTime = slot;
    });
    timeSlotsDiv.appendChild(div);
  });
}

document.getElementById('booking-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  if (!selectedTime) {
    alert('Please select a time slot.');
    return;
  }

  const submitBtn = document.querySelector('.btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Booking...';

  const data = {
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    email: document.getElementById('email').value.trim(),
    date: dateInput.value,
    time: selectedTime,
    service: serviceSelect.value,
    description: document.getElementById('description').value.trim()
  };

  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      document.getElementById('success-msg').style.display = 'block';
      document.getElementById('booking-form').reset();
      timeSlotsDiv.innerHTML = '';
      selectedTime = null;
      document.getElementById('booking-form').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => {
        document.getElementById('success-msg').style.display = 'none';
      }, 5000);
    } else {
      alert('Error: ' + result.error);
    }
  } catch {
    document.getElementById('error-msg').style.display = 'block';
    setTimeout(() => {
      document.getElementById('error-msg').style.display = 'none';
    }, 5000);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Book Appointment';
  }
});
