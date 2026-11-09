public class S10DaysToReachTests
{
    [Theory(DisplayName = "S10 貯まる日")]
    [InlineData("2 11 5 2\n", "3\n")]
    [InlineData("11 11 5 2\n", "0\n")]
    [InlineData("0 3 3 1\n", "2\n")]
    public void S10DaysToReach(string input, string expected)
    {
        Assert.Equal(expected, ConsoleOutput.Capture(() => ConsoleInput.With(input, () => Answers.S10DaysToReach())));
    }
}
