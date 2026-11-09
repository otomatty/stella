public class Q29Print3x3Tests
{
    [Fact(DisplayName = "Q29 3文字ずつ")]
    public void Q29Print3x3()
    {
        Assert.Equal("123\n456\n789\n", ConsoleOutput.Capture(() => Answers.Q29Print3x3("123456789")));
    }
}
