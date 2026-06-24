import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv('/Users/songye/Desktop/Dev/REU/CREMA-D/output/1001_DFA_ANG_XX.csv')
df.columns = df.columns.str.strip()

# df_average_confidence = df["confidence"].mean() = 0.98
# df_average_success = df["success"].mean() = 1
# print("Confidence: ", df_average_confidence)
# print("Success: ", df_average_success)
# print("\n")


# Dataframe of all AUc and AUr columns
df_aur = df[[col for col in df.columns if col.endswith('_r') and col.startswith('AU')]]
df_auc = df[[col for col in df.columns if col.endswith('_c') and col.startswith('AU')]]

print(df_aur.head(5))
print(df_auc.head(5))

df_aur.plot()
plt.xlabel('Frame')
plt.ylabel('AU Intensity')
plt.title('AU values over time - 1001_DFA_ANG_XX (Anger)')

# Save to folder before showing
plt.savefig('/Users/songye/Desktop/Dev/REU/scripts/au_plot.png', dpi=150, bbox_inches='tight')
plt.show()