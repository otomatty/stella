public class CheckAKindsTests
{
    [Theory(DisplayName = "確認A 2回以上の種類")]
    [InlineData("6\n1 1 2 3 3 3\n", "2\n")]
    [InlineData("1\n0\n", "0\n")]
    [InlineData("4\n4 4 4 4\n", "1\n")]
    [InlineData("4\n1 2 3 4\n", "0\n")]
    public void CheckAKinds(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.CheckAKinds())));
    }
}
