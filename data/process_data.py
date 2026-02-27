import pandas as pd

# Script to clean/format the data

def process():
    df = pd.read_csv('raw_logistics.csv')
    # placeholder processing
    return df

if __name__ == '__main__':
    print(process().head())
