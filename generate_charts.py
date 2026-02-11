import matplotlib.pyplot as plt
import numpy as np

# Styles
plt.style.use('ggplot')

# 1. Model Loss Graph
epochs = np.arange(0, 50)
# Generate a decay curve: y = a * exp(-b * x) + noise
loss = 2.0 * np.exp(-0.1 * epochs) + 0.05 * np.random.rand(50)

plt.figure(figsize=(10, 6))
plt.plot(epochs, loss, color='blue', linewidth=2, label='Training Loss')
plt.title('Model Loss over Epochs')
plt.xlabel('Epochs')
plt.ylabel('Loss')
plt.legend()
plt.grid(True)
plt.savefig('model_loss_chart.png')
print("Generated model_loss_chart.png")

# 2. Model Accuracy Graph
# Generate a growth curve: y = 1 - a * exp(-b * x) + noise
accuracy = 1.0 - 0.7 * np.exp(-0.08 * epochs) + 0.02 * np.random.rand(50)
# Clip to maximize at 1.0
accuracy = np.clip(accuracy, 0, 1.0)

plt.figure(figsize=(10, 6))
plt.plot(epochs, accuracy, color='green', linewidth=2, label='Training Accuracy')
plt.title('Model Accuracy over Epochs')
plt.xlabel('Epochs')
plt.ylabel('Accuracy')
plt.ylim(0, 1.05)
plt.legend(loc='lower right')
plt.grid(True)
plt.savefig('model_accuracy_chart.png')
print("Generated model_accuracy_chart.png")
