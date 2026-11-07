public class Q28CountMultiplesOf3Tests
{
    [Fact(DisplayName = "Q28 3の倍数の個数")]
    public void Q28CountMultiplesOf3()
    {
        Assert.Equal(3, Answers.Q28CountMultiplesOf3(new int[] { 3, 9, 4, 11, 6 }));
        Assert.Equal(0, Answers.Q28CountMultiplesOf3(new int[] { 1, 2, 4 }));
        Assert.Equal(1, Answers.Q28CountMultiplesOf3(new int[] { 3 }));
    }
}
