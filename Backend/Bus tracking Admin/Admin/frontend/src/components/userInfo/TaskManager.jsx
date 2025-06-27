import React, { useState } from 'react';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);

  const addTask = (task) => setTasks([...tasks, task]);

  return (
    <div>
      <h3>Tasks</h3>
      {/* Task input and list components go here */}
    </div>
  );
};

export default TaskManager;