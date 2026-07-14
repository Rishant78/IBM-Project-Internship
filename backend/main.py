from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
from pydantic import BaseModel
import pandas as pd
import numpy as np
import joblib
import os
import logging

# Initialize custom logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("RetentionAnalytics")

app = FastAPI(
    title="Player Engagement & Retention Analytics API",
    description="Upgraded Backend API for serving player engagement metrics, model insights, and predictions.",
    version="1.2.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for data and model
model = None
df_report = None
df_seq = None
df_meta = None

# Feature names in the exact order required by the model
FEATURE_NAMES = [
    'LevelsPlayed', 'SuccessfulLevels', 'TotalPlayTime', 'AverageLevelDuration',
    'HelpUsed', 'RestartCount', 'SuccessRate', 'HelpRate', 'RestartRate',
    'TimePerSuccess', 'AvgLevelPassRate', 'AvgMetaDuration', 'AvgRetryRate',
    'AvgWinningDuration'
]

@app.on_event("startup")
def startup_event():
    global model, df_report, df_seq, df_meta
    logger.info("Initializing Player Engagement and Retention Analytics System API...")
    
    # Load ML Model
    try:
        model = joblib.load("model/player_engagement_model.pkl")
        logger.info("Model loaded successfully from model/player_engagement_model.pkl.")
    except Exception as e:
        logger.error(f"Error loading RandomForest model pickle: {e}")
        raise RuntimeError(f"Could not load model file: {e}")
        
    # Load player engagement report
    try:
        df_report = pd.read_csv("model/player_engagement_report.csv")
        logger.info(f"Loaded player report: {len(df_report)} records.")
    except Exception as e:
        logger.error(f"Error loading report CSV: {e}")
        raise RuntimeError(f"Could not load report CSV: {e}")
        
    # Load level metadata
    try:
        df_meta = pd.read_csv("data/level_meta.csv", sep="\t")
        logger.info(f"Loaded level meta: {len(df_meta)} levels.")
    except Exception as e:
        logger.error(f"Error loading level meta CSV: {e}")
        raise RuntimeError(f"Could not load level meta CSV: {e}")

    # Load level sequence
    try:
        logger.info("Loading level sequence data (applying user_id sorting and indexing)...")
        df_seq = pd.read_csv("data/level_seq.csv", sep="\t")
        df_seq.set_index("user_id", inplace=True, drop=False)
        df_seq.sort_index(inplace=True)
        logger.info(f"Loaded level sequence: {len(df_seq)} rows.")
    except Exception as e:
        logger.error(f"Error loading level sequence CSV: {e}")
        raise RuntimeError(f"Could not load level sequence CSV: {e}")
        
    logger.info("API Started and fully active.")

def to_native(val):
    """
    Safely converts numpy numeric types to native Python types for JSON compatibility.
    """
    if pd.isna(val):
        return None
    if isinstance(val, (np.integer, np.int64, np.int32)):
        return int(val)
    if isinstance(val, (np.floating, np.float64, np.float32)):
        return float(val)
    return val

@app.get("/api/health")
def health_check():
    """
    Returns API runtime check details, model loading, and dataset metrics.
    """
    logger.info("Health check endpoint requested.")
    players_count = len(df_report) if df_report is not None else 0
    return {
        "status": "Healthy",
        "model_loaded": model is not None,
        "report_loaded": df_report is not None,
        "players": players_count
    }

@app.get("/")
def read_root():
    return RedirectResponse(url="/static/index.html")

@app.get("/api/summary")
def get_summary():
    """
    Returns aggregate computed high-level metrics for the dashboard summary cards.
    """
    if df_report is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
        
    total_players = len(df_report)
    avg_engagement = float(df_report["EngagementScore"].mean())
    avg_churn_prob = float(df_report["ChurnProbability"].mean())
    avg_playtime = float(df_report["TotalPlayTime"].mean())
    avg_levels_played = float(df_report["LevelsPlayed"].mean())
    
    # Risk counts
    high_risk_count = int((df_report["ChurnProbability"] >= 0.60).sum())
    highly_engaged_count = int((df_report["ChurnProbability"] < 0.20).sum())
    
    # Global rates
    avg_success_rate = float(df_report["SuccessRate"].mean())
    avg_restart_rate = float(df_report["RestartRate"].mean())
    
    category_counts = df_report["EngagementCategory"].value_counts().to_dict()
    category_dist = {cat: int(count) for cat, count in category_counts.items()}
    
    rec_counts = df_report["Recommendation"].value_counts().to_dict()
    rec_dist = {rec: int(count) for rec, count in rec_counts.items()}
    
    return {
        "total_players": total_players,
        "avg_engagement_score": round(avg_engagement, 2),
        "avg_churn_probability": round(avg_churn_prob, 4),
        "avg_playtime_minutes": round(avg_playtime / 60.0, 2),
        "avg_levels_played": round(avg_levels_played, 1),
        "high_risk_players": high_risk_count,
        "highly_engaged_players": highly_engaged_count,
        "avg_success_rate": round(avg_success_rate, 4),
        "avg_restart_rate": round(avg_restart_rate, 4),
        "engagement_categories": category_dist,
        "recommendations": rec_dist
    }

@app.get("/api/churn-distribution")
def get_churn_distribution():
    """
    Groups players into ten 10% bins based on ChurnProbability.
    """
    if df_report is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
        
    try:
        bins = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01]
        labels = ["0-10%", "10-20%", "20-30%", "30-40%", "40-50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"]
        
        categories = pd.cut(df_report["ChurnProbability"], bins=bins, labels=labels, right=False)
        counts_series = categories.value_counts().reindex(labels).fillna(0)
        
        return {
            "labels": labels,
            "counts": [int(c) for c in counts_series.tolist()]
        }
    except Exception as e:
        logger.error(f"Failed to calculate churn distribution: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate churn distribution: {e}")

@app.get("/api/feature-importance")
def get_feature_importance():
    """
    Loads model feature importances and returns them sorted descending.
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded.")
        
    try:
        importances = model.feature_importances_
        features_list = []
        for name, imp in zip(FEATURE_NAMES, importances):
            features_list.append({
                "name": name,
                "importance": round(float(imp), 4)
            })
        features_list.sort(key=lambda x: x["importance"], reverse=True)
        return features_list
    except Exception as e:
        logger.error(f"Failed to extract feature importances: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract feature importances: {e}")

@app.get("/api/model-comparison")
def get_model_comparison():
    """
    Returns model validation metrics for comparison table.
    """
    return [
        {"name": "Decision Tree", "accuracy": 69.2, "roc_auc": 0.70, "selected": False},
        {"name": "Logistic Regression", "accuracy": 71.8, "roc_auc": 0.74, "selected": False},
        {"name": "Random Forest", "accuracy": 71.26, "roc_auc": 0.75, "selected": True},
        {"name": "XGBoost", "accuracy": 70.9, "roc_auc": 0.74, "selected": False}
    ]

@app.get("/api/analytics-widgets")
def get_analytics_widgets():
    """
    Computes top players lists and level characteristics from the datasets.
    """
    if df_report is None or df_meta is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
        
    try:
        # 1. Top 10 High Risk Players
        top_risk_df = df_report.sort_values(by="ChurnProbability", ascending=False).head(10)
        top_risk = []
        for _, row in top_risk_df.iterrows():
            top_risk.append({
                "user_id": int(row["user_id"]),
                "ChurnProbability": float(row["ChurnProbability"]),
                "EngagementScore": float(row["EngagementScore"]),
                "EngagementCategory": str(row["EngagementCategory"])
            })
            
        # 2. Top 10 Loyal Players
        top_loyal_df = df_report.sort_values(by="ChurnProbability", ascending=True).head(10)
        top_loyal = []
        for _, row in top_loyal_df.iterrows():
            top_loyal.append({
                "user_id": int(row["user_id"]),
                "ChurnProbability": float(row["ChurnProbability"]),
                "EngagementScore": float(row["EngagementScore"]),
                "EngagementCategory": str(row["EngagementCategory"])
            })
            
        # 3. Top 10 Most Difficult Levels
        hard_levels_df = df_meta.sort_values(by="f_avg_passrate", ascending=True).head(10)
        hard_levels = []
        for _, row in hard_levels_df.iterrows():
            hard_levels.append({
                "level_id": int(row["level_id"]),
                "f_avg_passrate": float(row["f_avg_passrate"]),
                "f_avg_retrytimes": float(row["f_avg_retrytimes"]),
                "f_avg_duration": float(row["f_avg_duration"])
            })
            
        # 4. Top 10 Highest Restart Levels
        restart_levels_df = df_meta.sort_values(by="f_avg_retrytimes", ascending=False).head(10)
        restart_levels = []
        for _, row in restart_levels_df.iterrows():
            restart_levels.append({
                "level_id": int(row["level_id"]),
                "f_avg_passrate": float(row["f_avg_passrate"]),
                "f_avg_retrytimes": float(row["f_avg_retrytimes"]),
                "f_avg_duration": float(row["f_avg_duration"])
            })
            
        return {
            "top_high_risk_players": top_risk,
            "top_loyal_players": top_loyal,
            "hardest_levels": hard_levels,
            "highest_restart_levels": restart_levels
        }
    except Exception as e:
        logger.error(f"Failed to compile widgets: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate widgets data: {e}")

@app.get("/api/export")
def export_report():
    """
    Streams the player engagement report CSV for direct local download.
    """
    logger.info("Player engagement report export download requested.")
    file_path = "model/player_engagement_report.csv"
    if not os.path.exists(file_path):
        logger.error("Player engagement report CSV is missing on disk during export.")
        raise HTTPException(status_code=404, detail="Player engagement report CSV file not found on disk.")
    return FileResponse(
        path=file_path,
        filename="player_engagement_report.csv",
        media_type="text/csv"
    )

@app.get("/api/players")
def get_players(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: str = Query(None),
    category: str = Query(None)
):
    """
    Paginated, searchable list of players with filter options.
    """
    if df_report is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
        
    filtered_df = df_report.copy()
    
    if search:
        try:
            user_id_query = int(search)
            filtered_df = filtered_df[filtered_df["user_id"] == user_id_query]
        except ValueError:
            return {"players": [], "total": 0, "page": page, "limit": limit}
            
    if category:
        filtered_df = filtered_df[filtered_df["EngagementCategory"] == category]
        
    total_records = len(filtered_df)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    page_df = filtered_df.iloc[start_idx:end_idx].copy()
    
    players_list = []
    for _, row in page_df.iterrows():
        players_list.append({
            "user_id": int(row["user_id"]),
            "Churn": int(row["Churn"]),
            "LevelsPlayed": int(row["LevelsPlayed"]),
            "SuccessfulLevels": int(row["SuccessfulLevels"]),
            "TotalPlayTime": float(row["TotalPlayTime"]),
            "AverageLevelDuration": float(row["AverageLevelDuration"]),
            "HelpUsed": int(row["HelpUsed"]),
            "RestartCount": float(row["RestartCount"]),
            "SuccessRate": float(row["SuccessRate"]),
            "HelpRate": float(row["HelpRate"]),
            "RestartRate": float(row["RestartRate"]),
            "TimePerSuccess": float(row["TimePerSuccess"]),
            "AvgLevelPassRate": float(row["AvgLevelPassRate"]),
            "AvgMetaDuration": float(row["AvgMetaDuration"]),
            "AvgRetryRate": float(row["AvgRetryRate"]),
            "AvgWinningDuration": float(row["AvgWinningDuration"]),
            "EngagementScore": float(row["EngagementScore"]),
            "EngagementCategory": str(row["EngagementCategory"]),
            "ChurnProbability": float(row["ChurnProbability"]),
            "Recommendation": str(row["Recommendation"])
        })
        
    return {
        "players": players_list,
        "total": total_records,
        "page": page,
        "limit": limit
    }

@app.get("/api/player/{user_id}")
def get_player_details(user_id: int):
    """
    Returns player profile, history sequence, and compiles a dynamic rule-based AI Insight message.
    """
    if df_report is None or df_seq is None or df_meta is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
        
    user_row = df_report[df_report["user_id"] == user_id]
    if len(user_row) == 0:
        raise HTTPException(status_code=404, detail=f"Player with ID {user_id} not found in database.")
        
    player_data = user_row.iloc[0].to_dict()
    clean_player = {k: to_native(v) for k, v in player_data.items()}
            
    # Compile dynamic AI insight based on behavioral features
    s_rate = clean_player["SuccessRate"]
    r_rate = clean_player["RestartRate"]
    prob = clean_player["ChurnProbability"]
    category = clean_player["EngagementCategory"]
    levels_played = clean_player["LevelsPlayed"]
    
    # Logic for dynamic, customized human-readable AI Insights
    if category == "Highly Engaged" or prob < 0.20:
        ai_insight = "This player consistently completes levels with a high success rate and minimal restart behavior. Consider rewarding loyalty through exclusive content or progression incentives."
    elif category == "High Churn Risk" or prob >= 0.60:
        ai_insight = "This player demonstrates declining engagement with frequent restarts and a high churn probability. Recommend personalized rewards or re-engagement notifications."
    else:
        # Moderate or Low engagement insights
        friction_point = ""
        if r_rate > 0.35:
            friction_point = " They struggle on specific level design bottlenecks, indicated by frequent restarts."
        elif s_rate < 0.60:
            friction_point = " They face high level completion friction with lower success counts."
            
        ai_insight = f"This player demonstrates moderate engagement with a relatively healthy success rate. However,{friction_point if friction_point else ' restart behavior should be monitored closely.'} Recommend introducing new puzzle content instead of discount schemes to sustain motivation."

    clean_player["AI_Insight"] = ai_insight

    # Fetch attempts history sequence
    try:
        user_seq = df_seq.loc[[user_id]] if user_id in df_seq.index else pd.DataFrame()
    except KeyError:
        user_seq = pd.DataFrame()
        
    attempts = []
    if not user_seq.empty:
        merged = user_seq.merge(df_meta, on="level_id", how="left")
        if "time" in merged.columns:
            merged.sort_values(by="time", inplace=True)
            
        for _, row in merged.iterrows():
            attempts.append({
                "level_id": int(row["level_id"]),
                "f_success": int(row["f_success"]),
                "f_duration": float(row["f_duration"]) if not pd.isna(row["f_duration"]) else 0.0,
                "f_reststep": float(row["f_reststep"]) if not pd.isna(row["f_reststep"]) else 0.0,
                "f_help": int(row["f_help"]) if not pd.isna(row["f_help"]) else 0,
                "time": str(row["time"]),
                "f_avg_duration": float(row["f_avg_duration"]) if not pd.isna(row["f_avg_duration"]) else 0.0,
                "f_avg_passrate": float(row["f_avg_passrate"]) if not pd.isna(row["f_avg_passrate"]) else 1.0,
                "f_avg_retrytimes": float(row["f_avg_retrytimes"]) if not pd.isna(row["f_avg_retrytimes"]) else 0.0,
                "f_avg_win_duration": float(row["f_avg_win_duration"]) if not pd.isna(row["f_avg_win_duration"]) else 0.0
            })
            
    community_medians = {
        "LevelsPlayed": float(df_report["LevelsPlayed"].median()),
        "SuccessRate": float(df_report["SuccessRate"].median()),
        "HelpRate": float(df_report["HelpRate"].median()),
        "RestartRate": float(df_report["RestartRate"].median()),
        "TotalPlayTime": float(df_report["TotalPlayTime"].median())
    }
            
    return {
        "profile": clean_player,
        "history": attempts,
        "community_medians": community_medians
    }

@app.get("/api/levels")
def get_levels_summary(limit: int = Query(50, ge=1, le=100)):
    """
    Returns level statistics from level_meta.csv.
    """
    if df_meta is None:
        raise HTTPException(status_code=500, detail="Metadata not loaded.")
        
    hardest_levels = df_meta.sort_values(by="f_avg_passrate").head(limit)
    
    levels_list = []
    for _, row in hardest_levels.iterrows():
        levels_list.append({
            "level_id": int(row["level_id"]),
            "f_avg_duration": float(row["f_avg_duration"]),
            "f_avg_passrate": float(row["f_avg_passrate"]),
            "f_avg_win_duration": float(row["f_avg_win_duration"]),
            "f_avg_retrytimes": float(row["f_avg_retrytimes"])
        })
        
    return levels_list

class PredictionRequest(BaseModel):
    LevelsPlayed: int
    SuccessfulLevels: int
    TotalPlayTime: float
    AverageLevelDuration: float
    HelpUsed: int
    RestartCount: float
    SuccessRate: float
    HelpRate: float
    RestartRate: float
    TimePerSuccess: float
    AvgLevelPassRate: float
    AvgMetaDuration: float
    AvgRetryRate: float
    AvgWinningDuration: float

@app.post("/api/predict")
def predict_churn(req: PredictionRequest):
    """
    Inputs custom behavioral features and computes the RandomForest model predictions,
    classification confidence, and dynamic key factors explaining the model outcome.
    """
    logger.info("Scoring custom behavioral metrics via RandomForest model...")
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded.")
        
    input_data = pd.DataFrame([{
        "LevelsPlayed": req.LevelsPlayed,
        "SuccessfulLevels": req.SuccessfulLevels,
        "TotalPlayTime": req.TotalPlayTime,
        "AverageLevelDuration": req.AverageLevelDuration,
        "HelpUsed": req.HelpUsed,
        "RestartCount": req.RestartCount,
        "SuccessRate": req.SuccessRate,
        "HelpRate": req.HelpRate,
        "RestartRate": req.RestartRate,
        "TimePerSuccess": req.TimePerSuccess,
        "AvgLevelPassRate": req.AvgLevelPassRate,
        "AvgMetaDuration": req.AvgMetaDuration,
        "AvgRetryRate": req.AvgRetryRate,
        "AvgWinningDuration": req.AvgWinningDuration
    }])
    
    input_data = input_data[FEATURE_NAMES]
    
    try:
        # Run prediction probabilities
        probs = model.predict_proba(input_data)[0]
        prob = float(probs[1]) # Churn Probability
        
        # Confidence is the max probability between classes
        confidence_val = float(max(probs))
        
        engagement_score = float((1.0 - prob) * 100.0)
        
        if prob < 0.20:
            category = "Highly Engaged"
            recommendation = "Reward loyal players"
        elif prob < 0.40:
            category = "Moderately Engaged"
            recommendation = "Offer new content"
        elif prob < 0.60:
            category = "Low Engagement"
            recommendation = "Send engagement notifications"
        else:
            category = "High Churn Risk"
            recommendation = "Offer discounts or special rewards"
            
        # Determine Top Influencing Factors dynamically compared to dataset means
        top_factors = []
        if df_report is not None:
            mean_success = float(df_report["SuccessRate"].mean())
            mean_restart = float(df_report["RestartRate"].mean())
            mean_levels = float(df_report["LevelsPlayed"].mean())
            mean_playtime = float(df_report["TotalPlayTime"].mean())
        else:
            mean_success = 0.67
            mean_restart = 0.25
            mean_levels = 161.8
            mean_playtime = 17480.0
            
        if prob >= 0.50:
            # Factors triggering high churn risk
            if req.RestartRate > mean_restart:
                top_factors.append("High Restart Rate")
            if req.SuccessRate < mean_success:
                top_factors.append("Low Success Rate")
            if req.LevelsPlayed < mean_levels:
                top_factors.append("Low Levels Completed")
            if req.TotalPlayTime < mean_playtime:
                top_factors.append("Below Average Playtime")
        else:
            # Factors contributing to high retention
            if req.SuccessRate >= mean_success:
                top_factors.append("High Success Rate")
            if req.RestartRate <= mean_restart:
                top_factors.append("Low Restart Rate")
            if req.LevelsPlayed >= mean_levels:
                top_factors.append("High Levels Completed")
            if req.TotalPlayTime >= mean_playtime:
                top_factors.append("Above Average Playtime")
                
        if not top_factors:
            top_factors = ["Balanced Play Progression" if prob < 0.50 else "Atypical Behavior Deviation"]
            
        logger.info(f"Scored simulation: Churn Probability: {prob:.4f}, Confidence: {confidence_val:.4f}")
        return {
            "ChurnProbability": round(prob, 6),
            "Confidence": round(confidence_val, 4),
            "EngagementScore": round(engagement_score, 2),
            "EngagementCategory": category,
            "Recommendation": recommendation,
            "TopFactors": top_factors
        }
    except Exception as e:
        logger.error(f"Error predicting simulated metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {e}")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main.py:app", host="127.0.0.1", port=8000, reload=True)
