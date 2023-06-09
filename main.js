const startHour = 8;
const endHour = 19;
let state = {
  slots: [],
};

const hours = endHour - startHour;
console.log({
  startHour,
  endHour,
  hours,
});
const $day = document.querySelector(".day");
const $dayinner = document.querySelector(".day-inner");
let dayHeight = $dayinner.clientHeight;
let blockHeight = dayHeight / (hours * 4);

const $text = document.querySelector(".summary");
const $clearButton = document.querySelector(".clear-button");
$clearButton.addEventListener("click", function () {
  localStorage.removeItem("state");
  window.location.reload();
});

const $elements = {};
function createElement(element, ids, className) {
  $el = document.createElement(element);
  $el.id = ids.join("-");
  $el.className = className;
  ids.reduce((els, id) => {
    if (!els[id]) {
      els[id] = {
        $el,
        $elements: {},
      };
    }
    return els[id].$elements;
  }, $elements);
  return $el;
}
function getElement(ids) {
  let elements = $elements;
  let result;
  ids.forEach((id) => {
    if (id !== ids[ids.length - 1]) {
      elements = elements[id].$elements;
    } else {
      result = elements[id].$el;
    }
  });
  return result;
}

// On window resize update window size depending variables
window.addEventListener("resize", function () {
  dayHeight = $dayinner.clientHeight;
  blockHeight = dayHeight / (hours * 4);
});

// Now line
const $now = createElement("div", ["now"], "now");
$dayinner.appendChild($now);
function updateNow() {
  const now = new Date();
  $now.style.top = `calc(${
    (((now.getHours() - startHour) * 60 + now.getMinutes()) / (hours * 60)) *
    100
  }% - 1px)`;
}
updateNow();
setInterval(updateNow, 1000);

// Background (hourly) lines
const $lines = createElement("div", ["lines"], "lines");
$day.appendChild($lines);
for (let i = 0; i < hours + 1; i++) {
  const $line = createElement("div", ["lines", `line-${i}`], "line");
  $line.setAttribute("data-time", `${startHour + i}:00`);
  $lines.appendChild($line);
}

let mousedownstartOffset = 0;
let mousedownstartHour;
let activeSlot;

function init() {
  const storage = localStorage.getItem("state");
  if (!storage) return;
  const s = JSON.parse(storage);
  s.slots.forEach((slot) => createSlot(slot));
}

const DRAG_STATE_DOWN = "down";
const DRAG_STATE_UP = "up";
const DRAG_STATE_MOVE = "move";
function onDrag($el, callback) {
  let mousedownY;
  let isDown = false;
  function move(e) {
    if (!isDown) return;
    callback(e, DRAG_STATE_MOVE, e.screenY - mousedownY);
  }
  function up(e) {
    isDown = false;
    callback(e, DRAG_STATE_UP, e.screenY - mousedownY);
    document.body.removeEventListener("mousemove", move);
    document.body.removeEventListener("mouseup", up);
  }
  $el.addEventListener("mousedown", function (e) {
    e.stopImmediatePropagation();
    mousedownY = e.screenY;
    isDown = true;
    callback(e, DRAG_STATE_DOWN, 0);
    document.body.addEventListener("mousemove", move);
    document.body.addEventListener("mouseup", up);
  });
}

function setStart(slot, hour) {
  const $slot = getElement(["slots", slot.id]);
  slot.start = hour;
  $slot.style.top = `${((slot.start - startHour) / hours) * 100}%`;
  setHeight(slot);
  setState({
    slots: state.slots,
  });
}
function setEnd(slot, hour) {
  slot.end = hour;
  setHeight(slot);
  setState({ slots: state.slots });
}
function undraftSlot(slot) {
  const $slot = getElement(["slots", slot.id]);
  const $content = getElement(["slots", slot.id, "content"]);
  slot.draft = false;
  $content.setAttribute("contenteditable", true);
  $slot.classList.remove("draft");
  $content.focus();
  setState({ slots: state.slots });
}
function removeSlot(slot) {
  getElement(["slots", slot.id]).remove();
  setState({ slots: state.slots.filter((s) => s.id !== slot.id) });
}
function setDescription(slot, description) {
  slot.description = description;
  setState({ slots: state.slots });
}
function getHour(offset) {
  return (
    startHour +
    ((Math.floor(offset / blockHeight) * blockHeight) / dayHeight) * hours
  );
}
function getHourDelta(offset) {
  return ((Math.floor(offset / blockHeight) * blockHeight) / dayHeight) * hours;
}

function time(value) {
  const hours = Math.floor(value);
  const minutes = (value % 1) * 60;
  return `${(hours.toString().length === 1 ? "0" : "") + hours}:${
    (minutes.toString().length === 1 ? "0" : "") + minutes
  }`;
}

function setState(_state) {
  state = _state;
  // $text.innerHTML = state.slots
  //   .filter((s) => !s.draft && s.description)
  //   .map(
  //     (s) =>
  //       `${time(s.start)}-${time(s.end)} (${time(s.end - s.start)}) - ${
  //         s.description
  //       }`
  //   )
  //   .join("<br />");
  const m = state.slots
    .filter((s) => !s.draft && s.description)
    .reduce((map, slot) => {
      map[slot.description] =
        (map[slot.description] || 0) + slot.end - slot.start;
      return map;
    }, {});
  $text.innerHTML = `Total: ${time(
    Object.values(m).reduce((total, n) => total + n, 0)
  )}<br /><br />${Object.keys(m)
    .sort()
    .map((k) => `<span class="time">${time(m[k])}</span><span>${k}</span>`)
    .join("<br />")}`;
  localStorage.setItem("state", JSON.stringify(state));
}

function createSlot({ id, start, end, draft, description }) {
  const slotId = id || Math.round(Math.random() * 1000000);
  const $slot = createElement("div", ["slots", slotId], "slot draft");
  const $content = createElement(
    "div",
    ["slots", slotId, "content"],
    "content"
  );
  $content.innerHTML = description || "";
  if (!draft) {
    $content.setAttribute("contenteditable", true);
  }
  const $top = createElement("div", ["slots", slotId, "top"], "top");
  const $bottom = createElement("div", ["slots", slotId, "bottom"], "bottom");
  $slot.appendChild($content);
  $slot.appendChild($top);
  $slot.appendChild($bottom);

  const slot = {
    id: slotId,
    description,
    draft,
  };

  onDrag($slot, function (e, state, delta) {
    // Down, start dragging
    if (state === DRAG_STATE_DOWN) {
      if (activeSlot) {
        return;
      }
      activeSlot = slot;
      mousedownstartHour = activeSlot.start;
    }

    // Up, drop dragging
    if (state === DRAG_STATE_UP) {
      activeSlot = null;
      return;
    }

    if (!activeSlot) {
      return;
    }

    // Existing slot, move slot
    const diff = activeSlot.end - activeSlot.start;
    setStart(activeSlot, mousedownstartHour - startHour + getHour(delta));
    setEnd(activeSlot, mousedownstartHour - startHour + getHour(delta) + diff);
  });

  $content.addEventListener("blur", function () {
    if ($content.innerText.trim().length === 0) {
      removeSlot(slot);
    }
  });
  $content.addEventListener("input", function (e) {
    setDescription(slot, e.target.innerText);
  });

  let onDragStart = 0;
  onDrag($top, function (e, state, delta) {
    if (slot.draft || state === DRAG_STATE_UP) {
      return;
    }
    if (state === DRAG_STATE_DOWN) {
      onDragStart = slot.start;
    }
    const hourDelta = getHourDelta(delta);
    setStart(slot, onDragStart + hourDelta);
  });
  onDrag($bottom, function (e, state, delta) {
    if (slot.draft || state === DRAG_STATE_UP) {
      return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    if (state === DRAG_STATE_DOWN) {
      onDragStart = slot.end;
    }
    const hourDelta = getHourDelta(delta);
    setEnd(slot, onDragStart + hourDelta);
  });

  $dayinner.appendChild($slot);
  setState({ slots: [...state.slots, slot] });
  setStart(slot, start);
  setEnd(slot, end);
  return slot;
}
function setHeight(slot) {
  const $slot = getElement(["slots", slot.id]);
  if (slot.end - slot.start > 0.25) {
    $slot.classList.remove("short");
  } else {
    $slot.classList.add("short");
  }
  $slot.style.height = `calc(${
    (Math.max(0.25, slot.end - slot.start) / hours) * 100
  }% - 1px)`;
}

onDrag($dayinner, function (e, state, delta) {
  // Mouse down, create slot
  if (state === DRAG_STATE_DOWN) {
    if (e.target != $dayinner) return;
    mousedownstartOffset = e.offsetY;
    const slot = createSlot({
      start: getHour(e.offsetY),
      end: getHour(e.offsetY),
      draft: true,
    });
    activeSlot = slot;
    return;
  }

  // Nothing to drag
  if (!activeSlot) {
    return;
  }

  // End drag
  if (state === DRAG_STATE_UP) {
    setEnd(activeSlot, getHour(mousedownstartOffset + delta) + 0.25);
    undraftSlot(activeSlot);
    activeSlot = null;
    return;
  }

  // New slot, make bigger using dragging
  if (activeSlot.draft) {
    setEnd(activeSlot, getHour(mousedownstartOffset + delta) + 0.25);
    return;
  }
});

init();
