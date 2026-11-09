public class Q29PassFailTests
{
    [Fact(DisplayName = "Q29 合格か")]
    public void Q29PassFail()
    {
        Assert.Equal("pass", Answers.Q29PassFail(60));
        Assert.Equal("fail", Answers.Q29PassFail(59));
    }
}
