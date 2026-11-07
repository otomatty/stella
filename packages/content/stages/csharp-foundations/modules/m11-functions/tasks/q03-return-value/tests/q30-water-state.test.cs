public class Q30WaterStateTests
{
    [Fact(DisplayName = "Q30 水の状態")]
    public void Q30WaterState()
    {
        Assert.Equal("ice", Answers.Q30WaterState(-1));
        Assert.Equal("water", Answers.Q30WaterState(0));
        Assert.Equal("water", Answers.Q30WaterState(100));
        Assert.Equal("steam", Answers.Q30WaterState(101));
    }
}
